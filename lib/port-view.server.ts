import { database } from "@/lib/db.server";

/** Recording is best effort: callers catch, and a failed write must never fail the request. */

let ensuring: Promise<void> | null = null;

/** `port_view` is one row per account and crossing, with a running count of opens. */
export function ensurePortViewTable(): Promise<void> {
  if (!ensuring) {
    const sql = database();
    ensuring = (async () => {
      await sql`
        create table if not exists port_view (
          user_id text not null references profile (id) on delete cascade,
          port_number text not null,
          opens integer not null default 0,
          last_opened_at timestamptz not null default now(),
          primary key (user_id, port_number)
        )
      `;
    })().catch((error: unknown) => {
      ensuring = null;
      throw error;
    });
  }
  return ensuring;
}

/**
 * Counts one open of this crossing by this account. A second open inside 10 seconds is the same
 * look (a remount, a double tap), so it changes nothing.
 */
export async function recordPortView(userId: string, portNumber: string): Promise<void> {
  await ensurePortViewTable();
  const sql = database();
  await sql`
    insert into port_view (user_id, port_number, opens) values (${userId}, ${portNumber}, 1)
    on conflict (user_id, port_number) do update
    set opens = port_view.opens + 1, last_opened_at = now()
    where port_view.last_opened_at < now() - interval '10 seconds'
  `;
}

export type PortViewRow = { userId: string; portNumber: string; opens: number; lastOpenedAt: string | null };

type Row = { user_id: string; port_number: string; opens: unknown; last_opened_at: Date | string | null };

/** Every account and crossing with its count, for the admin page. */
export async function readPortViews(): Promise<PortViewRow[]> {
  await ensurePortViewTable();
  const sql = database();
  const rows = (await sql`
    select user_id, port_number, opens, last_opened_at from port_view
  `) as Row[];
  return rows.map((row) => {
    const opened = row.last_opened_at ? new Date(row.last_opened_at) : null;
    const opens = typeof row.opens === "number" ? row.opens : Number(row.opens);
    return {
      userId: row.user_id,
      portNumber: row.port_number,
      opens: Number.isFinite(opens) ? opens : 0,
      lastOpenedAt: opened && !Number.isNaN(opened.getTime()) ? opened.toISOString() : null,
    };
  });
}
