/** Client-safe. No server imports here. */

/**
 * One message the admin sent to every device on file at once - "the app changed, come look" -
 * as opposed to `wait_alert` (one lane, one account) or `schedule` (one account, on a timer).
 */
/** Where the in-app copy of a broadcast sits. The push itself is unchanged. */
export type AnnouncementSurface = "banner" | "modal";

export function isAnnouncementSurface(value: unknown): value is AnnouncementSurface {
  return value === "banner" || value === "modal";
}

export type Announcement = {
  id: string;
  title: string;
  body: string;
  url: string;
  /** Banner sits under the bridges header. Modal covers the screen until it is closed. */
  surface: AnnouncementSurface;
  /** An inactive broadcast is kept in the history but no longer shows in the app. The push already went out. */
  active: boolean;
  /** For a scheduled one this is when it was created until it goes out, then when it went out. */
  sentAt: string;
  recipients: number;
  /** `scheduled` waits for `scheduledFor`; `failed` came due with no device to send to. */
  status: AnnouncementStatus;
  /** ISO time the admin picked, or null for one sent right away. */
  scheduledFor: string | null;
};

export type AnnouncementStatus = "sent" | "scheduled" | "failed";

export function isAnnouncementStatus(value: unknown): value is AnnouncementStatus {
  return value === "sent" || value === "scheduled" || value === "failed";
}

/** A scheduled time must be a real moment at least a minute ahead and within a year. */
export function parseScheduledFor(value: unknown, now = Date.now()): string | null {
  if (typeof value !== "string") return null;
  const time = Date.parse(value);
  if (Number.isNaN(time)) return null;
  if (time < now + 60_000 || time > now + 365 * 24 * 60 * 60 * 1000) return null;
  return new Date(time).toISOString();
}

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
export type AnnouncementInput = {
  title: string;
  body: string;
  url: string;
  surface: AnnouncementSurface;
  /** Present when the admin asked for a later time. An invalid time makes the whole input invalid. */
  scheduledFor: string | null;
};

export function parseAnnouncementInput(value: unknown): AnnouncementInput | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.title !== "string" || typeof record.body !== "string") return null;
  const url = isAnnouncementUrl(record.url) ? record.url : "/";
  const surface = isAnnouncementSurface(record.surface) ? record.surface : "modal";
  let scheduledFor: string | null = null;
  if (record.scheduledFor !== undefined && record.scheduledFor !== null) {
    scheduledFor = parseScheduledFor(record.scheduledFor);
    if (!scheduledFor) return null;
  }
  return { title: record.title, body: record.body, url, surface, scheduledFor };
}

/** What `PATCH /api/admin/announcements` accepts. */
export function parseAnnouncementActive(value: unknown): { id: string; active: boolean } | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string" || record.id.length === 0 || record.id.length > 64) return null;
  if (typeof record.active !== "boolean") return null;
  return { id: record.id, active: record.active };
}
