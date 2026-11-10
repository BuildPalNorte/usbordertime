import { randomUUID } from "node:crypto";
import { isExcludedFromAnalytics, isVisitorId } from "@/lib/analytics";
import { database } from "@/lib/db.server";

/** Recording is best effort: callers catch, and a failed write must never fail the request. */

let ensuring: Promise<void> | null = null;

/** `visitor` is one row per browser that opened the sign-in screen. Created on first use. */
export function ensureVisitorTable(): Promise<void> {
  if (!ensuring) {
    const sql = database();
    ensuring = (async () => {
      await sql`
        create table if not exists visitor (
          id text primary key,
          first_seen timestamptz not null default now(),
          last_seen timestamptz not null default now(),
          user_id text references profile (id) on delete cascade
        )
      `;
      await sql`alter table visitor add column if not exists campaign text`;
      await sql`
        create index if not exists visitor_campaign_idx
        on visitor (campaign)
        where campaign is not null
      `;
    })().catch((error: unknown) => {
      ensuring = null;
      throw error;
    });
  }
  return ensuring;
}

/** Whether the server has already made this id. A cookie can hold any UUID, so a valid shape proves nothing. */
export async function knownVisitor(id: string): Promise<boolean> {
  await ensureVisitorTable();
  const sql = database();
  const rows = await sql`select 1 from visitor where id = ${id} limit 1`;
  return rows.length > 0;
}

/**
 * Notes one more sign-in screen from this browser. Returns the id to keep in the cookie: the one
 * it already had, or a new one. A campaign code sticks on the first visit that had one.
 */
export async function recordVisitor(existing: string | null, campaign: string | null): Promise<string> {
  await ensureVisitorTable();
  const sql = database();
  const id = isVisitorId(existing) ? existing : randomUUID();
  await sql`
    insert into visitor (id, campaign) values (${id}, ${campaign})
    on conflict (id) do update
    set last_seen = now(),
        campaign = coalesce(visitor.campaign, excluded.campaign)
  `;
  return id;
}

/**
 * Called when this browser signs in. Attaches the visitor to the account, only when nobody has
 * it yet, so a shared computer stays with its first person. An excluded account removes the row
 * instead, so its own testing never counts.
 */
export async function claimVisitor(visitorId: string | null, userId: string, email: string): Promise<void> {
  if (!isVisitorId(visitorId)) return;
  await ensureVisitorTable();
  const sql = database();
  if (isExcludedFromAnalytics(email)) {
    await sql`delete from visitor where id = ${visitorId}`;
    return;
  }
  await sql`update visitor set user_id = ${userId} where id = ${visitorId} and user_id is null`;
}

export type Arrivals = {
  /** Browsers that opened the sign-in screen. */
  total: number;
  /** Of those, how many went on to sign in. */
  registered: number;
  weekTotal: number;
  weekRegistered: number;
};

type ArrivalRow = { total: unknown; registered: unknown; week_total: unknown; week_registered: unknown };

function count(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Counts in SQL, so the dashboard never reads every visitor. */
export async function readArrivals(): Promise<Arrivals> {
  await ensureVisitorTable();
  const sql = database();
  const rows = (await sql`
    select
      count(*)::int as total,
      count(*) filter (where user_id is not null)::int as registered,
      count(*) filter (where first_seen > now() - interval '7 days')::int as week_total,
      count(*) filter (where first_seen > now() - interval '7 days' and user_id is not null)::int as week_registered
    from visitor
  `) as ArrivalRow[];
  const row = rows[0];
  return {
    total: count(row?.total),
    registered: count(row?.registered),
    weekTotal: count(row?.week_total),
    weekRegistered: count(row?.week_registered),
  };
}

export type GuestDay = { day: string; guests: number };

/**
 * New guests per Central day. A guest is a browser that still has no account, so someone who
 * later signed in is left out and counted with accounts instead.
 */
export async function readGuestDays(): Promise<GuestDay[]> {
  await ensureVisitorTable();
  const sql = database();
  const rows = (await sql`
    select to_char(first_seen at time zone 'America/Chicago', 'YYYY-MM-DD') as day,
           count(*)::int as guests
    from visitor
    where user_id is null
    group by 1
  `) as { day: unknown; guests: unknown }[];
  return rows.flatMap((row) => {
    const day = typeof row.day === "string" ? row.day : "";
    const guests = count(row.guests);
    return /^\d{4}-\d{2}-\d{2}$/.test(day) ? [{ day, guests }] : [];
  });
}
