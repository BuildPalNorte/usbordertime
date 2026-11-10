import type { PushDevice } from "@/lib/alert";
import { ensureTables as ensureAlertTables, forgetPushDevice } from "@/lib/alert.server";
import {
  ANNOUNCEMENT_HISTORY,
  cleanAnnouncementText,
  isAnnouncementStatus,
  isAnnouncementSurface,
  MAX_ANNOUNCEMENT_BODY,
  MAX_ANNOUNCEMENT_TITLE,
  type Announcement,
  type AnnouncementSurface,
} from "@/lib/announcement";
import { database } from "@/lib/db.server";
import { sendPush } from "@/lib/push.server";
import { revalidateTag, unstable_cache } from "next/cache";
import { randomUUID } from "node:crypto";

let ensuring: Promise<void> | null = null;

/** One row per broadcast, kept for the history list. It does not gate delivery - the push already went out. */
function ensureTable(): Promise<void> {
  if (!ensuring) {
    const sql = database();
    ensuring = (async () => {
      await ensureAlertTables();
      await sql`
        create table if not exists announcement (
          id text primary key,
          title text not null,
          body text not null,
          url text not null default '/',
          sent_by text references profile (id) on delete set null,
          recipients integer not null default 0,
          created_at timestamptz not null default now()
        )
      `;
      await sql`alter table announcement add column if not exists surface text not null default 'modal'`;
      await sql`alter table announcement add column if not exists status text not null default 'sent'`;
      await sql`alter table announcement add column if not exists scheduled_for timestamptz`;
      const had = (await sql`
        select 1 from information_schema.columns
        where table_name = 'announcement' and column_name = 'active'
      `) as unknown[];
      await sql`alter table announcement add column if not exists active boolean not null default true`;
      // Rows from before the switch all defaulted to on. Only one may be live, and it is the newest.
      if (had.length === 0) {
        await sql`
          update announcement set active = false
          where id <> coalesce((select id from announcement order by created_at desc limit 1), '')
        `;
      }
    })().catch((error: unknown) => {
      ensuring = null;
      throw error;
    });
  }
  return ensuring;
}

type Row = {
  id: string;
  title: string;
  body: string;
  url: string;
  surface: string;
  active: boolean;
  recipients: number;
  created_at: unknown;
  status: string;
  scheduled_for: unknown;
};

function toIso(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function fromRow(row: Row): Announcement {
  const createdAt = row.created_at instanceof Date ? row.created_at : new Date(String(row.created_at));
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    url: row.url,
    surface: isAnnouncementSurface(row.surface) ? row.surface : "modal",
    active: row.active,
    recipients: row.recipients,
    status: isAnnouncementStatus(row.status) ? row.status : "sent",
    scheduledFor: toIso(row.scheduled_for),
    sentAt: Number.isNaN(createdAt.getTime()) ? new Date().toISOString() : createdAt.toISOString(),
  };
}

export async function listAnnouncements(): Promise<Announcement[]> {
  await ensureTable();
  const sql = database();
  const rows = (await sql`
    select id, title, body, url, surface, active, recipients, created_at, status, scheduled_for
    from announcement
    order by coalesce(scheduled_for, created_at) desc
    limit ${ANNOUNCEMENT_HISTORY}
  `) as Row[];
  return rows.map(fromRow);
}

/**
 * The one live broadcast, for the in-app banner or modal every signed-in rider sees on
 * their next open - not only the devices that had push permission on when it went out.
 * `AnnouncementNotice` waits until the welcome tour on this browser is finished and off
 * screen, then decides whether this one has already been dismissed on this device.
 */
async function readLatestAnnouncement(): Promise<Announcement | null> {
  await ensureTable();
  const sql = database();
  const rows = (await sql`
    select id, title, body, url, surface, active, recipients, created_at, status, scheduled_for
    from announcement
    where active
    order by created_at desc
    limit 1
  `) as Row[];
  return rows[0] ? fromRow(rows[0]) : null;
}

const LATEST_ANNOUNCEMENT_TAG = "latest-announcement";

/**
 * Every signed-in page load asks for this, and a broadcast is rare, so the answer is cached
 * across requests. `unstable_cache` survives between serverless instances; `use cache` would not.
 * `sendAnnouncement` is the only writer and drops it, and the hour is only a safety net.
 */
export const latestAnnouncement = unstable_cache(readLatestAnnouncement, ["latest-announcement"], {
  tags: [LATEST_ANNOUNCEMENT_TAG],
  revalidate: 60 * 60,
});

/**
 * Turns the in-app copy of a broadcast on or off. At most one is on at a time: turning one on turns
 * every other off in the same statement, so an older one can be brought back by switching the
 * newest off and the older on. Off keeps the history row and does not recall the push. Like
 * `sendAnnouncement`, it drops the cached live one so the next page load sees the change.
 */
export async function setAnnouncementActive(id: string, active: boolean): Promise<Announcement | null> {
  await ensureTable();
  const sql = database();
  const rows = (
    active
      ? await sql`
          update announcement set active = (id = ${id})
          where (active or id = ${id}) and status = 'sent'
          returning id, title, body, url, surface, active, recipients, created_at, status, scheduled_for
        `
      : await sql`
          update announcement set active = false where id = ${id} and status = 'sent'
          returning id, title, body, url, surface, active, recipients, created_at, status, scheduled_for
        `
  ) as Row[];
  const row = rows.find((entry) => entry.id === id);
  if (!row) return null;
  revalidateTag(LATEST_ANNOUNCEMENT_TAG, { expire: 0 });
  return fromRow(row);
}

export type SendAnnouncement =
  | { status: "ok"; announcement: Announcement }
  | { status: "empty" }
  | { status: "no-devices" };

const SEND_BATCH = 25;

/** Pushes to every device on file and returns how many accepted, or null when there are none. */
async function pushToEveryone(title: string, body: string, url: string): Promise<number | null> {
  const sql = database();
  const rows = (await sql`select endpoint, p256dh, auth from push_subscription`) as {
    endpoint: string;
    p256dh: string;
    auth: string;
  }[];
  if (rows.length === 0) return null;

  const devices: PushDevice[] = rows.map((row) => ({
    endpoint: row.endpoint,
    keys: { p256dh: row.p256dh, auth: row.auth },
  }));
  const tag = `announcement:${randomUUID()}`;

  let sent = 0;
  for (let i = 0; i < devices.length; i += SEND_BATCH) {
    const batch = devices.slice(i, i + SEND_BATCH);
    const results = await Promise.all(
      batch.map(async (device) => {
        const result = await sendPush(device, { title, body, url, tag });
        if (result === "gone") await forgetPushDevice(device.endpoint);
        return result;
      }),
    );
    sent += results.filter((result) => result === "sent").length;
  }
  return sent;
}

/**
 * One push to every device on file, whichever account it belongs to. Unlike a wait alert or a
 * schedule, an announcement is not scoped to one account - it is the admin speaking to everyone
 * who has notifications on at once. A device that answers gone is forgotten, same as any other push.
 */
export async function sendAnnouncement(
  adminUserId: string,
  rawTitle: string,
  rawBody: string,
  url: string,
  surface: AnnouncementSurface,
): Promise<SendAnnouncement> {
  const title = cleanAnnouncementText(rawTitle, MAX_ANNOUNCEMENT_TITLE);
  const body = cleanAnnouncementText(rawBody, MAX_ANNOUNCEMENT_BODY);
  if (!title || !body) return { status: "empty" };

  await ensureTable();
  const sent = await pushToEveryone(title, body, url);
  if (sent === null) return { status: "no-devices" };

  const sql = database();
  const id = randomUUID();
  const [row] = (await sql`
    insert into announcement (id, title, body, url, surface, sent_by, recipients)
    values (${id}, ${title}, ${body}, ${url}, ${surface}, ${adminUserId}, ${sent})
    returning id, title, body, url, surface, active, recipients, created_at, status, scheduled_for
  `) as Row[];

  // A new broadcast is the live one, and only one is live.
  await sql`update announcement set active = false where active and id <> ${id}`;

  // The next page load must see this one, not the cached previous broadcast.
  revalidateTag(LATEST_ANNOUNCEMENT_TAG, { expire: 0 });

  return { status: "ok", announcement: fromRow(row) };
}

const SCHEDULED_TAG = "scheduled-announcement";

async function readNextScheduledAt(): Promise<string | null> {
  await ensureTable();
  const sql = database();
  const rows = (await sql`
    select min(scheduled_for) as next from announcement where status = 'scheduled'
  `) as { next: unknown }[];
  return toIso(rows[0]?.next);
}

/**
 * When the earliest waiting announcement is due, or null. Cached so the 15 minute cron tick
 * does not open the database (and wake Neon) when nothing is waiting. Every write that adds,
 * cancels, or sends a scheduled row drops it.
 */
export const nextScheduledAnnouncementAt = unstable_cache(readNextScheduledAt, ["scheduled-announcement"], {
  tags: [SCHEDULED_TAG],
  revalidate: 12 * 60 * 60,
});

/** Saves an announcement to go out at `scheduledFor` (an ISO time). Nothing is pushed now. */
export async function scheduleAnnouncement(
  adminUserId: string,
  rawTitle: string,
  rawBody: string,
  url: string,
  surface: AnnouncementSurface,
  scheduledFor: string,
): Promise<{ status: "ok"; announcement: Announcement } | { status: "empty" }> {
  const title = cleanAnnouncementText(rawTitle, MAX_ANNOUNCEMENT_TITLE);
  const body = cleanAnnouncementText(rawBody, MAX_ANNOUNCEMENT_BODY);
  if (!title || !body) return { status: "empty" };

  await ensureTable();
  const sql = database();
  const id = randomUUID();
  const [row] = (await sql`
    insert into announcement (id, title, body, url, surface, sent_by, recipients, active, status, scheduled_for)
    values (${id}, ${title}, ${body}, ${url}, ${surface}, ${adminUserId}, 0, false, 'scheduled', ${scheduledFor})
    returning id, title, body, url, surface, active, recipients, created_at, status, scheduled_for
  `) as Row[];
  revalidateTag(SCHEDULED_TAG, { expire: 0 });
  return { status: "ok", announcement: fromRow(row) };
}

/** Deletes one that has not gone out yet. Returns false when it already sent or does not exist. */
export async function cancelScheduledAnnouncement(id: string): Promise<boolean> {
  await ensureTable();
  const sql = database();
  const rows = (await sql`
    delete from announcement where id = ${id} and status in ('scheduled', 'failed') returning id
  `) as unknown[];
  revalidateTag(SCHEDULED_TAG, { expire: 0 });
  return rows.length > 0;
}

/**
 * Sends every scheduled announcement whose time has come. Each is claimed in one `update` first
 * (`scheduled` to `sending`), so overlapping runs send it once. With no device to push to it is
 * marked `failed` instead of retrying forever.
 */
export async function runDueAnnouncements(): Promise<{ sent: number; failed: number }> {
  await ensureTable();
  const sql = database();
  const due = (await sql`
    update announcement set status = 'sending'
    where status = 'scheduled' and scheduled_for <= now()
    returning id, title, body, url, surface
  `) as { id: string; title: string; body: string; url: string; surface: string }[];

  let sent = 0;
  let failed = 0;
  for (const item of due) {
    try {
      const recipients = await pushToEveryone(item.title, item.body, item.url);
      if (recipients === null) {
        await sql`update announcement set status = 'failed' where id = ${item.id}`;
        failed += 1;
        continue;
      }
      // It is the live one now, and only one is live.
      await sql`
        update announcement
        set status = 'sent', recipients = ${recipients}, created_at = now(), active = true
        where id = ${item.id}
      `;
      await sql`update announcement set active = false where active and id <> ${item.id}`;
      sent += 1;
    } catch (error) {
      // Let the next tick try again rather than strand it in `sending`.
      await sql`update announcement set status = 'scheduled' where id = ${item.id}`;
      console.error("scheduled announcement", error);
    }
  }
  revalidateTag(SCHEDULED_TAG, { expire: 0 });
  if (sent > 0) revalidateTag(LATEST_ANNOUNCEMENT_TAG, { expire: 0 });
  return { sent, failed };
}
