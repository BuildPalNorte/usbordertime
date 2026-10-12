/** Client-safe. No server imports here. */

/**
 * One message the admin sent to every device on file at once - "the app changed, come look" -
 * as opposed to `wait_alert` (one lane, one account) or `schedule` (one account, on a timer).
 */
export type Announcement = {
  id: string;
  title: string;
  body: string;
  url: string;
  sentAt: string;
  recipients: number;
};

export const MAX_ANNOUNCEMENT_TITLE = 60;
export const MAX_ANNOUNCEMENT_BODY = 160;
export const ANNOUNCEMENT_HISTORY = 20;

/**
 * Trims control characters and collapses whitespace, like a schedule name. Unlike a schedule name,
 * an empty announcement field is left empty, not turned into null - the caller decides that means
 * "nothing to send."
 */
export function cleanAnnouncementText(value: string, max: number): string {
  return [...value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim()]
    .slice(0, max)
    .join("")
    .trim();
}

/**
 * Same-origin path only, like every other notification link in this app. An absolute address in
 * the compose form could point the push anywhere, so it is rejected rather than sent as-is.
 */
export function isAnnouncementUrl(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 200 && value.startsWith("/");
}

/** What the route accepts, before it's cleaned and validated. */
export type AnnouncementInput = { title: string; body: string; url: string };

export function parseAnnouncementInput(value: unknown): AnnouncementInput | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.title !== "string" || typeof record.body !== "string") return null;
  const url = isAnnouncementUrl(record.url) ? record.url : "/";
  return { title: record.title, body: record.body, url };
}
