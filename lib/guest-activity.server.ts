import { CAMPAIGN_COOKIE, campaignQuery } from "@/lib/campaign";
import { knownCampaign } from "@/lib/campaign.server";
import { database } from "@/lib/db.server";
import { VISITOR_COOKIE } from "@/lib/analytics";
import { ensureVisitorTable, recordVisitor } from "@/lib/visitor.server";
import { cookies } from "next/headers";

/**
 * What a browser does before it has an account. One row per open of the app, and one per crossing
 * it opens. Tied to the visitor cookie, never to a name. Created on first use.
 */

let ensuring: Promise<void> | null = null;

const YEAR = 60 * 60 * 24 * 365;

export function ensureGuestActivityTable(): Promise<void> {
  if (!ensuring) {
    const sql = database();
    ensuring = (async () => {
      await ensureVisitorTable();
      await sql`
        create table if not exists guest_event (
          id bigserial primary key,
          visitor_id text not null references visitor (id) on delete cascade,
          kind text not null check (kind in ('open', 'view')),
          port_number text,
          created_at timestamptz not null default now()
        )
      `;
      await sql`
        create index if not exists guest_event_kind_created_idx on guest_event (kind, created_at)
      `;
      await sql`
        create index if not exists guest_event_visitor_kind_idx on guest_event (visitor_id, kind, created_at)
      `;
    })().catch((error: unknown) => {
      ensuring = null;
      throw error;
    });
  }
  return ensuring;
}

/** The browser this request already is, or a new visitor id stored in the cookie. */
export async function visitorForActivity(): Promise<string> {
  const jar = await cookies();
  let campaign: string | null = null;
  try {
    campaign = await knownCampaign(campaignQuery(jar.get(CAMPAIGN_COOKIE)?.value ?? null));
  } catch (error) {
    console.error("campaign", error);
  }
  const id = await recordVisitor(jar.get(VISITOR_COOKIE)?.value ?? null, campaign);
  jar.set(VISITOR_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: YEAR,
  });
  return id;
}

/** One open of the app. A second one for this browser within 15 seconds is the same entry. */
export async function recordGuestOpen(visitorId: string): Promise<void> {
  await ensureGuestActivityTable();
  const sql = database();
  await sql`
    insert into guest_event (visitor_id, kind)
    select ${visitorId}, 'open'
    where not exists (
      select 1 from guest_event
      where visitor_id = ${visitorId}
        and kind = 'open'
        and created_at > now() - interval '15 seconds'
    )
  `;
}

/** One look at a crossing. A repeat of the same crossing within 10 seconds changes nothing. */
export async function recordGuestView(visitorId: string, portNumber: string): Promise<void> {
  await ensureGuestActivityTable();
  const sql = database();
  await sql`
    insert into guest_event (visitor_id, kind, port_number)
    select ${visitorId}, 'view', ${portNumber}
    where not exists (
      select 1 from guest_event
      where visitor_id = ${visitorId}
        and kind = 'view'
        and port_number = ${portNumber}
        and created_at > now() - interval '10 seconds'
    )
  `;
}

export type GuestOpenDay = { day: string; opens: number; guests: number };

export type GuestOpenSpan = { guests: number; opens: number; days: GuestOpenDay[] };

function asCount(value: unknown): number {
  const count = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(count) ? count : 0;
}

/** Guest opens in a Central-time span. `guests` is distinct browsers across the whole span. */
export async function readGuestOpenSpan(from: string, to: string): Promise<GuestOpenSpan> {
  await ensureGuestActivityTable();
  const sql = database();
  const rows = (await sql`
    select
      to_char(day, 'YYYY-MM-DD') as day,
      count(*)::int as opens,
      count(distinct visitor_id)::int as guests
    from (
      select visitor_id, (created_at at time zone 'America/Chicago')::date as day
      from guest_event
      where kind = 'open'
        and created_at >= (${from}::timestamp at time zone 'America/Chicago')
        and created_at < ((${to}::date + 1)::timestamp at time zone 'America/Chicago')
    ) days
    group by rollup(day)
  `) as { day: string | null; opens: unknown; guests: unknown }[];
  const total = rows.find((row) => row.day === null);
  return {
    guests: asCount(total?.guests),
    opens: asCount(total?.opens),
    days: rows.flatMap((row) => {
      if (typeof row.day !== "string") return [];
      return [{ day: row.day.slice(0, 10), opens: asCount(row.opens), guests: asCount(row.guests) }];
    }),
  };
}

export type GuestPortViews = { portNumber: string; opens: number; viewers: number };

/** How many guests opened each crossing, and how many times. */
export async function readGuestPortViews(): Promise<GuestPortViews[]> {
  await ensureGuestActivityTable();
  const sql = database();
  const rows = (await sql`
    select port_number, count(*)::int as opens, count(distinct visitor_id)::int as viewers
    from guest_event
    where kind = 'view' and port_number is not null
    group by port_number
  `) as { port_number: unknown; opens: unknown; viewers: unknown }[];
  return rows.flatMap((row) => {
    if (typeof row.port_number !== "string" || !row.port_number) return [];
    return [{ portNumber: row.port_number, opens: asCount(row.opens), viewers: asCount(row.viewers) }];
  });
}
