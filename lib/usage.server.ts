import { USAGE_KINDS, type UsageKind } from "@/lib/usage";
import { neon } from "@neondatabase/serverless";

/** Recording is best effort: a failed write must never fail the request that caused it. */

function database() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Missing DATABASE_URL");
  return neon(url);
}

let ensuring: Promise<void> | null = null;

/** `usage_event` belongs to a profile and is created on first use. */
export function ensureUsageTable(): Promise<void> {
  if (!ensuring) {
    const sql = database();
    ensuring = (async () => {
      await sql`
        create table if not exists usage_event (
          id bigserial primary key,
          user_id text not null references profile (id) on delete cascade,
          kind text not null,
          created_at timestamptz not null default now(),
          constraint usage_event_kind_check check (kind in ('visit', 'ask', 'alert', 'alarm', 'sync'))
        )
      `;
      await sql`
        create index if not exists usage_event_user_kind_idx on usage_event (user_id, kind)
      `;
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
