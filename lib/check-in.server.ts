import { ensureTables as ensureAlertTables } from "@/lib/alert.server";
import {
  chatDayStart,
  firstName,
  REACTIONS,
  REPORTS_TO_HIDE,
  snippet,
  type CheckIn,
  type Reaction,
  type ReportReason,
  type Unread,
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
      // A reply points at the post it answers. If that post is deleted, the reply stays as a plain message.
      await sql`
        alter table check_in
        add column if not exists reply_to text references check_in (id) on delete set null
      `;
      await sql`
        create index if not exists check_in_port_created_idx on check_in (port_number, created_at desc)
      `;
      // One report per rider and post. Reports go with the post when it is deleted; what stays is the
      // count on the author's account (`usage_event`), which is all moderation needs once the chat resets.
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
  quote_id: string | null;
  quote_name: string | null;
  quote_message: string | null;
  quote_photo: boolean | null;
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
  // The 50 newest posts are picked first (index scan on port + time), then one pass over their
  // reactions counts both kinds and the viewer's own, instead of four lookups per row.
  const me = actor ?? "";
  const rows = (await sql`
    select c.id, p.name, c.message, c.has_photo, c.created_at,
           (c.user_id = ${userId ?? ""}) as mine,
           coalesce(r.likes, 0)::int as likes,
           coalesce(r.helpfuls, 0)::int as helpfuls,
           coalesce(r.liked, false) as liked,
           coalesce(r.helped, false) as helped,
           q.id as quote_id, qp.name as quote_name, q.message as quote_message,
           (q.photo is not null) as quote_photo
    from (
      select id, user_id, message, (photo is not null) as has_photo, created_at, reply_to
      from check_in
      where port_number = ${portNumber}
        and hidden_at is null
        and created_at > ${chatDayStart()}::timestamptz
        and not exists (
          select 1 from check_in_report x where x.check_in_id = check_in.id and x.actor = ${me}
        )
      order by created_at desc
      limit 50
    ) c
    join profile p on p.id = c.user_id
    left join check_in q on q.id = c.reply_to and q.hidden_at is null
    left join profile qp on qp.id = q.user_id
    left join lateral (
      select count(*) filter (where kind = 'like') as likes,
             count(*) filter (where kind = 'helpful') as helpfuls,
             bool_or(kind = 'like' and actor = ${me}) as liked,
             bool_or(kind = 'helpful' and actor = ${me}) as helped
      from check_in_reaction
      where check_in_id = c.id
    ) r on true
    order by c.created_at desc
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
    replyTo: row.quote_id
      ? {
          id: row.quote_id,
          name: firstName(row.quote_name),
          message: row.quote_message ? snippet(row.quote_message) : null,
          hasPhoto: Boolean(row.quote_photo),
        }
      : null,
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
    where id = ${id} and created_at > ${chatDayStart()}::timestamptz
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

/** The post a new one answers, when it can still be answered: live, visible, and at the same crossing. */
export type ReplyTarget = { id: string; authorId: string };

export async function saveCheckIn(input: {
  userId: string;
  portNumber: string;
  message: string | null;
  photo: Uint8Array | null;
  milesAway: number;
  /** The id of the post being answered. Ignored when that post is gone, hidden, or elsewhere. */
  replyTo?: string | null;
}): Promise<{ id: string; reply: ReplyTarget | null }> {
  await ensureTable();
  const sql = database();
  const encoded = input.photo ? Buffer.from(input.photo).toString("base64") : null;

  let reply: ReplyTarget | null = null;
  if (input.replyTo) {
    const parents = (await sql`
      select id, user_id from check_in
      where id = ${input.replyTo}
        and port_number = ${input.portNumber}
        and hidden_at is null
        and created_at > ${chatDayStart()}::timestamptz
    `) as { id: string; user_id: string }[];
    if (parents[0]) reply = { id: parents[0].id, authorId: parents[0].user_id };
  }

  const rows = (await sql`
    insert into check_in (user_id, port_number, message, photo, miles_away, reply_to)
    values (
      ${input.userId}, ${input.portNumber}, ${input.message},
      case when ${encoded}::text is null then null else decode(${encoded}::text, 'base64') end,
      ${input.milesAway}, ${reply?.id ?? null}
    )
    returning id
  `) as { id: string }[];
  return { id: rows[0].id, reply };
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
      and created_at > ${chatDayStart()}::timestamptz
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
    where id = ${id} and created_at > ${chatDayStart()}::timestamptz
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
 * For each `{ port, since }`: how many live posts by others are newer than `since` (capped to the
 * hours the chat shows), and how many of those answer one of `userId`'s posts. One query for all
 * of a rider's bridges, on the (port, time) index. Bridges with nothing new are left out.
 */
export async function unreadCheckIns(
  watch: { port: string; since: number }[],
  userId: string | null,
  actor: string | null,
): Promise<Record<string, Unread>> {
  if (watch.length === 0) return {};
  await ensureTable();
  const sql = database();
  const me = userId ?? "";
  const reporter = actor ?? "";
  const rows = (await sql`
    select c.port_number, count(*)::int as messages,
           (count(*) filter (where q.user_id = ${me}))::int as replies
    from unnest(${watch.map((w) => w.port)}::text[], ${watch.map((w) => String(w.since))}::bigint[]) as w(port, since)
    join check_in c
      on c.port_number = w.port
     and c.created_at > greatest(${chatDayStart()}::timestamptz, to_timestamp(w.since / 1000.0))
    left join check_in q on q.id = c.reply_to
    where c.hidden_at is null
      and c.user_id <> ${me}
      and not exists (
        select 1 from check_in_report x where x.check_in_id = c.id and x.actor = ${reporter}
      )
    group by c.port_number
  `) as { port_number: string; messages: number; replies: number }[];
  return Object.fromEntries(rows.map((r) => [r.port_number, { messages: r.messages, replies: r.replies }]));
}
