import { ensureTables as ensureAlertTables } from "@/lib/alert.server";
import {
  CHECK_IN_VISIBLE_HOURS,
  firstName,
  REACTIONS,
  REPORTS_TO_HIDE,
  type CheckIn,
  type Reaction,
  type ReportReason,
} from "@/lib/check-in";
import { database } from "@/lib/db.server";

let ensuring: Promise<void> | null = null;

/**
 * `check_in` belongs to a profile and is created on first use. It keeps no coordinates: the
 * position is checked against the crossing and then dropped, and only the distance is saved.
 * The photo is the JPEG the browser already shrank, kept as bytes and served by id.
 */
function ensureTable(): Promise<void> {
  if (!ensuring) {
    const sql = database();
    ensuring = (async () => {
      await ensureAlertTables();
      await sql`
        create table if not exists check_in (
          id text primary key default gen_random_uuid()::text,
          user_id text not null references profile (id) on delete cascade,
          port_number text not null,
          message text,
          photo bytea,
          miles_away real not null,
          created_at timestamptz not null default now()
        )
      `;
      await sql`alter table check_in add column if not exists hidden_at timestamptz`;
      await sql`
        create index if not exists check_in_port_created_idx on check_in (port_number, created_at desc)
      `;
      // One report per rider and post. Reports go with the post when it is deleted; what stays is the
      // count on the author's account (`usage_event`), which is all moderation needs after 6 hours.
      await sql`
        create table if not exists check_in_report (
          check_in_id text not null references check_in (id) on delete cascade,
          actor text not null,
          reason text not null,
          created_at timestamptz not null default now(),
          primary key (check_in_id, actor)
        )
      `;
      // One row per rider and reaction. `actor` is `u:` plus an account id, or `v:` plus a visitor id,
      // so a guest can react too. It is not a foreign key: a guest has no account to point at.
      await sql`
        create table if not exists check_in_reaction (
          check_in_id text not null references check_in (id) on delete cascade,
          actor text not null,
          kind text not null check (kind in ('like', 'helpful')),
          created_at timestamptz not null default now(),
          primary key (check_in_id, actor, kind)
        )
      `;
    })().catch((error: unknown) => {
      ensuring = null;
      throw error;
    });
  }
  return ensuring;
}

type Row = {
  id: string;
  name: string | null;
  message: string | null;
  has_photo: boolean;
  created_at: string | Date;
  mine: boolean;
  likes: number;
  helpfuls: number;
  liked: boolean;
  helped: boolean;
};

/**
 * The latest posts at a crossing, oldest first, the way a chat reads. `actor` names the viewer for
 * reactions (`reactorKey`); `userId` is only for "mine". Names are first names.
 */
export async function listCheckIns(
  portNumber: string,
  userId: string | null,
  actor: string | null,
): Promise<CheckIn[]> {
  await ensureTable();
  const sql = database();
  const rows = (await sql`
    select c.id, p.name, c.message, (c.photo is not null) as has_photo, c.created_at,
           (c.user_id = ${userId ?? ""}) as mine,
           (select count(*)::int from check_in_reaction r where r.check_in_id = c.id and r.kind = 'like') as likes,
           (select count(*)::int from check_in_reaction r where r.check_in_id = c.id and r.kind = 'helpful') as helpfuls,
           exists (select 1 from check_in_reaction r where r.check_in_id = c.id and r.kind = 'like' and r.actor = ${actor ?? ""}) as liked,
           exists (select 1 from check_in_reaction r where r.check_in_id = c.id and r.kind = 'helpful' and r.actor = ${actor ?? ""}) as helped
    from check_in c
    join profile p on p.id = c.user_id
    where c.port_number = ${portNumber}
      and c.hidden_at is null
      and not exists (select 1 from check_in_report x where x.check_in_id = c.id and x.actor = ${actor ?? ""})
      and c.created_at > now() - make_interval(hours => ${CHECK_IN_VISIBLE_HOURS})
    order by c.created_at desc
    limit 50
  `) as Row[];
  return rows.reverse().map((row) => ({
    id: row.id,
    name: firstName(row.name),
    message: row.message,
    hasPhoto: row.has_photo,
    at: new Date(row.created_at).toISOString(),
    mine: row.mine,
    reactions: { like: row.likes, helpful: row.helpfuls },
    reacted: { like: row.liked, helpful: row.helped },
  }));
}

export const reactorKey = {
  user: (id: string) => `u:${id}`,
  visitor: (id: string) => `v:${id}`,
};

/** Sets or clears one reaction. False when the post is gone (or older than the thread shows). */
export async function setReaction(
  id: string,
  actor: string,
  kind: Reaction,
  on: boolean,
): Promise<boolean> {
  if (!REACTIONS.includes(kind)) return false;
  await ensureTable();
  const sql = database();
  const live = (await sql`
    select 1 from check_in
    where id = ${id} and created_at > now() - make_interval(hours => ${CHECK_IN_VISIBLE_HOURS})
  `) as unknown[];
  if (live.length === 0) return false;
  if (on) {
    await sql`
      insert into check_in_reaction (check_in_id, actor, kind) values (${id}, ${actor}, ${kind})
      on conflict do nothing
    `;
  } else {
    await sql`
      delete from check_in_reaction where check_in_id = ${id} and actor = ${actor} and kind = ${kind}
    `;
  }
  return true;
}

export async function saveCheckIn(input: {
  userId: string;
  portNumber: string;
  message: string | null;
  photo: Uint8Array | null;
  milesAway: number;
}): Promise<string> {
  await ensureTable();
  const sql = database();
  const encoded = input.photo ? Buffer.from(input.photo).toString("base64") : null;
  const rows = (await sql`
    insert into check_in (user_id, port_number, message, photo, miles_away)
    values (
      ${input.userId}, ${input.portNumber}, ${input.message},
      case when ${encoded}::text is null then null else decode(${encoded}::text, 'base64') end,
      ${input.milesAway}
    )
    returning id
  `) as { id: string }[];
  return rows[0].id;
}

/** Removes one of the account's own check-ins. False when it was not theirs or is already gone. */
export async function deleteCheckIn(userId: string, id: string): Promise<boolean> {
  await ensureTable();
  const sql = database();
  const rows = (await sql`
    delete from check_in where id = ${id} and user_id = ${userId} returning id
  `) as unknown[];
  return rows.length > 0;
}

/** The photo's JPEG bytes, or null. Only check-ins still on a crossing are served. */
export async function readCheckInPhoto(id: string): Promise<Buffer | null> {
  await ensureTable();
  const sql = database();
  const rows = (await sql`
    select encode(photo, 'base64') as photo from check_in
    where id = ${id} and photo is not null and hidden_at is null
      and created_at > now() - make_interval(hours => ${CHECK_IN_VISIBLE_HOURS})
  `) as { photo: string }[];
  return rows[0] ? Buffer.from(rows[0].photo, "base64") : null;
}

export type ReportResult =
  | { status: "missing" | "own" | "ok" }
  | { status: "hidden"; authorId: string };

/**
 * Records one rider's report of a live post. The reporter never sees it again. When enough
 * different riders have reported it, it is hidden from everyone, once, and the author is named so
 * the caller can count it against their account.
 */
export async function reportCheckIn(
  id: string,
  actor: string,
  userId: string | null,
  reason: ReportReason,
): Promise<ReportResult> {
  await ensureTable();
  const sql = database();
  const posts = (await sql`
    select user_id from check_in
    where id = ${id} and created_at > now() - make_interval(hours => ${CHECK_IN_VISIBLE_HOURS})
  `) as { user_id: string }[];
  const post = posts[0];
  if (!post) return { status: "missing" };
  if (userId && post.user_id === userId) return { status: "own" };

  await sql`
    insert into check_in_report (check_in_id, actor, reason) values (${id}, ${actor}, ${reason})
    on conflict do nothing
  `;
  const counted = (await sql`
    select count(*)::int as count from check_in_report where check_in_id = ${id}
  `) as { count: number }[];
  if (Number(counted[0]?.count ?? 0) < REPORTS_TO_HIDE) return { status: "ok" };

  // Only the report that crosses the line hides it, so the author is counted once.
  const hidden = (await sql`
    update check_in set hidden_at = now() where id = ${id} and hidden_at is null returning user_id
  `) as { user_id: string }[];
  return hidden[0] ? { status: "hidden", authorId: hidden[0].user_id } : { status: "ok" };
}

/**
 * Deletes posts with their photos, reactions and reports. Returns how many. Normally that is every
 * post past the visible window; with `everything` (the chat has closed for the night) it is all of them.
 */
export async function purgeExpiredCheckIns(everything = false): Promise<number> {
  await ensureTable();
  const sql = database();
  const rows = (everything
    ? await sql`delete from check_in returning id`
    : await sql`
        delete from check_in
        where created_at < now() - make_interval(hours => ${CHECK_IN_VISIBLE_HOURS})
        returning id
      `) as unknown[];
  return rows.length;
}
