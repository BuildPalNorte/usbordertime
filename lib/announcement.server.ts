import type { PushDevice } from "@/lib/alert";
import { ensureTables as ensureAlertTables, forgetPushDevice } from "@/lib/alert.server";
import {
  ANNOUNCEMENT_HISTORY,
  cleanAnnouncementText,
  isAnnouncementSurface,
  MAX_ANNOUNCEMENT_BODY,
  MAX_ANNOUNCEMENT_TITLE,
  type Announcement,
  type AnnouncementSurface,
} from "@/lib/announcement";
import { database } from "@/lib/db.server";
import { sendPush } from "@/lib/push.server";
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
  recipients: number;
  created_at: unknown;
};

function fromRow(row: Row): Announcement {
  const createdAt = row.created_at instanceof Date ? row.created_at : new Date(String(row.created_at));
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    url: row.url,
    surface: isAnnouncementSurface(row.surface) ? row.surface : "modal",
    recipients: row.recipients,
    sentAt: Number.isNaN(createdAt.getTime()) ? new Date().toISOString() : createdAt.toISOString(),
  };
}

export async function listAnnouncements(): Promise<Announcement[]> {
  await ensureTable();
  const sql = database();
  const rows = (await sql`
    select id, title, body, url, surface, recipients, created_at
    from announcement
    order by created_at desc
    limit ${ANNOUNCEMENT_HISTORY}
  `) as Row[];
  return rows.map(fromRow);
}

/**
 * The single most recent broadcast, for the in-app banner or modal every signed-in rider sees on
 * their next open - not only the devices that had push permission on when it went out.
 * `AnnouncementNotice` decides whether this one has already been dismissed on this device.
 */
export async function latestAnnouncement(): Promise<Announcement | null> {
  await ensureTable();
  const sql = database();
  const rows = (await sql`
    select id, title, body, url, surface, recipients, created_at
    from announcement
    order by created_at desc
    limit 1
  `) as Row[];
  return rows[0] ? fromRow(rows[0]) : null;
}

export type SendAnnouncement =
  | { status: "ok"; announcement: Announcement }
  | { status: "empty" }
  | { status: "no-devices" };

const SEND_BATCH = 25;

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
  const sql = database();
  const rows = (await sql`select endpoint, p256dh, auth from push_subscription`) as {
    endpoint: string;
    p256dh: string;
    auth: string;
  }[];
  if (rows.length === 0) return { status: "no-devices" };

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

  const id = randomUUID();
  const [row] = (await sql`
    insert into announcement (id, title, body, url, surface, sent_by, recipients)
    values (${id}, ${title}, ${body}, ${url}, ${surface}, ${adminUserId}, ${sent})
    returning id, title, body, url, surface, recipients, created_at
  `) as Row[];

  return { status: "ok", announcement: fromRow(row) };
}
