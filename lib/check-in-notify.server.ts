import { forgetPushDevice, listPushDevices } from "@/lib/alert.server";
import { firstName, snippet } from "@/lib/check-in";
import { database } from "@/lib/db.server";
import { COPY, isLocale, type Locale } from "@/lib/i18n";
import { ensurePreferenceTable } from "@/lib/preference.server";
import { sendPush, type PushPayload } from "@/lib/push.server";
import { crossingPath } from "@/lib/routes";
import { withinLimit } from "@/lib/throttle.server";

/** One rider can push this many replies to one other rider an hour. More than that is pestering. */
const REPLY_PUSHES_PER_HOUR = 10;
/** A reply is still worth reading for the hour or so the thread is being used. */
export const REPLY_PUSH_TTL = 3600;

/** The crossing a reply happened at, as the notification names it. */
export type ReplyPlace = { portNumber: string; bridge: string };

/** What opens when the notification is tapped: the crossing, with its chat already up. */
export function chatPath(portNumber: string): string {
  return `${crossingPath(portNumber)}?chat=1`;
}

/** The notification for one reply. */
export function replyPayload(input: {
  senderName: string | null;
  locale: Locale;
  place: ReplyPlace;
  message: string | null;
  parentId: string;
}): PushPayload {
  const copy = COPY[input.locale];
  const text = input.message ? snippet(input.message, 120) : copy.checkInReplyPhoto;
  return {
    title: copy.checkInReplyPushTitle(firstName(input.senderName)),
    body: `${input.place.bridge} · ${text}`,
    url: chatPath(input.place.portNumber),
    // A later reply to the same post replaces the one still on the screen.
    tag: `chat-reply:${input.parentId}`,
  };
}

/**
 * Tells the author of a post that someone answered it. Does nothing for a reply to your own post,
 * for an author with no registered device, or once one sender has pushed too many to one person.
 * Runs after the response is sent, so a failure here never fails the post. Returns whether a
 * device took it.
 */
export async function notifyReply(input: {
  authorId: string;
  recipientId: string;
  parentId: string;
  place: ReplyPlace;
  message: string | null;
}): Promise<boolean> {
  if (input.authorId === input.recipientId) return false;

  const devices = await listPushDevices(input.recipientId);
  if (devices.length === 0) return false;
  if (!(await withinLimit("check-in-reply-push", REPLY_PUSHES_PER_HOUR, 3600, `${input.authorId}>${input.recipientId}`))) {
    return false;
  }

  await ensurePreferenceTable();
  const sql = database();
  const rows = (await sql`
    select p.name, f.locale
    from profile p
    left join preference f on f.user_id = ${input.recipientId}
    where p.id = ${input.authorId}
  `) as { name: string | null; locale: string | null }[];
  const row = rows[0];
  if (!row) return false;

  const payload = replyPayload({
    senderName: row.name,
    locale: isLocale(row.locale) ? row.locale : "en",
    place: input.place,
    message: input.message,
    parentId: input.parentId,
  });

  const results = await Promise.all(
    devices.map(async (device) => {
      const result = await sendPush(device, payload, REPLY_PUSH_TTL);
      // The address is dead. Dropping it is housekeeping, so it must not turn a sent reply into a failure.
      if (result === "gone") await forgetPushDevice(device.endpoint).catch(() => undefined);
      return result;
    }),
  );
  return results.includes("sent");
}
