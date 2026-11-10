import { fillOpenDays, type AppOpens } from "@/lib/app-opens";
import { ANALYTICS_EXCLUDED_EMAILS } from "@/lib/analytics";
import { database } from "@/lib/db.server";
import { USAGE_KINDS, type UsageKind } from "@/lib/usage";

/** Recording is best effort: a failed write must never fail the request that caused it. */

const KIND_LIST = USAGE_KINDS.map((kind) => `'${kind}'`).join(", ");

let ensuring: Promise<void> | null = null;

/** `usage_event` belongs to a profile and is created on first use. */
export function ensureUsageTable(): Promise<void> {
  if (!ensuring) {
    const sql = database();
    ensuring = (async () => {
      await sql.query(`
        create table if not exists usage_event (
          id bigserial primary key,
          user_id text not null references profile (id) on delete cascade,
          kind text not null,
          created_at timestamptz not null default now(),
          constraint usage_event_kind_check check (kind in (${KIND_LIST}))
        )
      `);
      // A table created before `open` existed still has the old check. Replace it in one statement.
      await sql.query(`
        do $$
        begin
          alter table usage_event drop constraint if exists usage_event_kind_check;
          alter table usage_event add constraint usage_event_kind_check check (kind in (${KIND_LIST}));
        end $$;
      `);
      await sql.query(`
        create index if not exists usage_event_user_kind_idx on usage_event (user_id, kind)
      `);
      await sql.query(`
        create index if not exists usage_event_kind_created_idx on usage_event (kind, created_at)
      `);
    })().catch((error: unknown) => {
      ensuring = null;
      throw error;
    });
  }
  return ensuring;
}

/** Logs one action. Never throws, so the caller's response is unaffected. */
export async function recordUsage(userId: string, kind: UsageKind): Promise<void> {
  try {
    await ensureUsageTable();
    const sql = database();
    await sql`insert into usage_event (user_id, kind) values (${userId}, ${kind})`;
  } catch (error) {
    console.error("usage record", kind, error);
  }
}

/**
 * Logs one `ask` and reports whether the account is still under `limit` asks in the last minute.
 * The count lives in the database, so it holds across serverless instances. Counting the attempt
 * itself first means two requests that arrive together cannot both slip under the limit. If the
 * database is down the caller falls back to its per-instance limit.
 */
export async function claimAsk(userId: string, limit: number): Promise<boolean | null> {
  try {
    await ensureUsageTable();
    const sql = database();
    const rows = (await sql`
      with logged as (
        insert into usage_event (user_id, kind) values (${userId}, 'ask') returning id
      )
      select count(*)::int as count
      from usage_event
      where user_id = ${userId} and kind = 'ask' and created_at > now() - interval '1 minute'
        and id <> (select id from logged)
    `) as { count: number }[];
    return Number(rows[0]?.count ?? 0) < limit;
  } catch (error) {
    console.error("ask limit", error);
    return null;
  }
}

export type UsageTotals = {
  userId: string;
  total: number;
  lastActive: string | null;
  byKind: Partial<Record<UsageKind, number>>;
};

type TotalRow = { user_id: string; kind: string; count: number; last_at: Date | string | null };

/**
 * Per-account totals for the admin dashboard, one row per account that has any activity. The
 * count is in SQL so the dashboard never reads every event.
 */
export async function readUsageTotals(): Promise<UsageTotals[]> {
  await ensureUsageTable();
  const sql = database();
  const rows = (await sql`
    select user_id, kind, count(*)::int as count, max(created_at) as last_at
    from usage_event
    group by user_id, kind
  `) as TotalRow[];

  const byUser = new Map<string, UsageTotals>();
  for (const row of rows) {
    if (!(USAGE_KINDS as readonly string[]).includes(row.kind)) continue;
    const entry =
      byUser.get(row.user_id) ?? { userId: row.user_id, total: 0, lastActive: null, byKind: {} };
    const count = typeof row.count === "number" ? row.count : Number(row.count) || 0;
    entry.total += count;
    entry.byKind[row.kind as UsageKind] = count;
    const last = row.last_at ? new Date(row.last_at) : null;
    if (last && !Number.isNaN(last.getTime())) {
      const iso = last.toISOString();
      if (!entry.lastActive || iso > entry.lastActive) entry.lastActive = iso;
    }
    byUser.set(row.user_id, entry);
  }
  return [...byUser.values()].sort(
    (a, b) => b.total - a.total || (b.lastActive ?? "").localeCompare(a.lastActive ?? ""),
  );
}

/**
 * Logs one app open. A second open for the same account within 15 seconds is skipped, so a reload
 * or a double mount does not count twice. Never throws.
 */
export async function recordAppOpen(userId: string): Promise<void> {
  try {
    await ensureUsageTable();
    const sql = database();
    await sql`
      insert into usage_event (user_id, kind)
      select ${userId}, 'open'
      where not exists (
        select 1 from usage_event
        where user_id = ${userId}
          and kind = 'open'
          and created_at > now() - interval '15 seconds'
      )
    `;
  } catch (error) {
    console.error("usage record", "open", error);
  }
}

function asCount(value: unknown): number {
  const count = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(count) ? count : 0;
}

/**
 * Unique accounts and every open in a Central-time span, plus one row per day. Unique is counted
 * across the whole span, so it is not the sum of the days.
 *
 * `open` is each time someone comes in. `visit` is the older once-a-day record of that same thing.
 * A visit on a day that already has an open for that account is left out, so the two are not added.
 */
export async function readAppOpens(from: string, to: string): Promise<AppOpens> {
  await ensureUsageTable();
  const sql = database();
  const excluded = ANALYTICS_EXCLUDED_EMAILS.map((email) => email.trim().toLowerCase());
  const rows = (await sql`
    with events as (
      select user_id, created_at, kind
      from usage_event
      where kind in ('visit', 'open')
        and created_at >= (${from}::timestamp at time zone 'America/Chicago')
        and created_at < ((${to}::date + 1)::timestamp at time zone 'America/Chicago')
        and user_id not in (select id from profile where lower(email) = any(${excluded}))
    ),
    uses as (
      select user_id, created_at from events where kind = 'open'
      union all
      select user_id, created_at from events e
      where kind = 'visit'
        and not exists (
          select 1 from events o
          where o.kind = 'open'
            and o.user_id = e.user_id
            and (o.created_at at time zone 'America/Chicago')::date
              = (e.created_at at time zone 'America/Chicago')::date
        )
    )
    select
      to_char(day, 'YYYY-MM-DD') as day,
      count(*)::int as opens,
      count(distinct user_id)::int as people
    from (
      select user_id, (created_at at time zone 'America/Chicago')::date as day from uses
    ) days
    group by rollup(day)
    order by day
  `) as { day: string | null; opens: unknown; people: unknown }[];
  const total = rows.find((row) => row.day === null);
  const days = rows.flatMap((row) => {
    if (typeof row.day !== "string") return [];
    return [{ day: row.day.slice(0, 10), people: asCount(row.people), opens: asCount(row.opens) }];
  });
  return {
    from,
    to,
    people: asCount(total?.people),
    opens: asCount(total?.opens),
    days: fillOpenDays(from, to, days),
  };
}
