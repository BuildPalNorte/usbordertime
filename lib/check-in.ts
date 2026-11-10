import type { PortWaitTime } from "@/lib/border-wait-times";
import { thresholdQuiet } from "@/lib/notify-window";
import { haversineMiles, portLocation, type GeoPoint } from "@/lib/port-locations";

/** Client-safe. No server imports here. */

export const MAX_CHECK_IN_MESSAGE = 240;
/** The browser shrinks a photo to this edge before sending, so the server limit is generous. */
export const PHOTO_MAX_EDGE = 1280;
export const MAX_CHECK_IN_PHOTO_BYTES = 700_000;
/** A chat, so no cooldown between posts. This many posts an hour per account is a flood. */
export const CHECK_IN_POSTS_PER_HOUR = 40;
/** A position read this recently is reused for the next post, so a conversation asks once. */
export const POSITION_REUSE_MS = 5 * 60_000;
/** This many different riders reporting a message hides it from everyone. */
export const REPORTS_TO_HIDE = 3;
/** This many of an account's messages hidden inside the window pauses its posting. */
export const HIDDEN_TO_MUTE = 3;
export const MUTE_WINDOW_HOURS = 24;
export const REPORT_REASONS = ["abuse", "spam", "photo", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
export function isReportReason(value: unknown): value is ReportReason {
  return typeof value === "string" && (REPORT_REASONS as readonly string[]).includes(value);
}
export const REACTIONS = ["like", "helpful"] as const;
export type Reaction = (typeof REACTIONS)[number];
export function isReaction(value: unknown): value is Reaction {
  return typeof value === "string" && (REACTIONS as readonly string[]).includes(value);
}
/**
 * The chat sleeps on the same clock as threshold alerts, 10:00pm to 4:00am Central. Nobody is
 * crossing and nobody is reading, and a closed chat leaves the database alone.
 */
export function chatClosed(at: Date = new Date()): boolean {
  return thresholdQuiet(at);
}
/** Check-ins stay on a crossing this long. The line they describe is gone by then. */
export const CHECK_IN_VISIBLE_HOURS = 6;

/**
 * How far from a crossing still counts as "at the bridge". Crossings are placed by city
 * (`CITY_LOCATION`), and a city such as El Paso or Laredo has bridges several miles apart, so this
 * is the width of a border town, not of a parking lot.
 */
export const CHECK_IN_RADIUS_MILES = 8;
/** A reading less certain than this proves nothing, so the rider is asked to try again. */
export const MAX_ACCURACY_METERS = 3000;
/** Up to this much of the reading's own uncertainty is given back to the rider. */
const ACCURACY_ALLOWANCE_METERS = 1000;
const METERS_PER_MILE = 1609.344;

export type Presence =
  | { ok: true; miles: number }
  | { ok: false; reason: "far"; miles: number }
  | { ok: false; reason: "imprecise" | "unknown" };

/** Whether a position reading puts the rider near `port`. The server runs the same check. */
export function checkPresence(
  port: PortWaitTime,
  point: GeoPoint,
  accuracyMeters: number,
): Presence {
  const place = portLocation(port);
  if (!place) return { ok: false, reason: "unknown" };
  if (!Number.isFinite(accuracyMeters) || accuracyMeters < 0 || accuracyMeters > MAX_ACCURACY_METERS) {
    return { ok: false, reason: "imprecise" };
  }
  const miles = haversineMiles(point, place);
  const allowance = Math.min(accuracyMeters, ACCURACY_ALLOWANCE_METERS) / METERS_PER_MILE;
  if (miles > CHECK_IN_RADIUS_MILES + allowance) return { ok: false, reason: "far", miles };
  return { ok: true, miles };
}

/** What a crossing shows for one check-in. No location is ever part of it. */
export type CheckIn = {
  id: string;
  /** First name only. */
  name: string;
  message: string | null;
  hasPhoto: boolean;
  /** ISO time. */
  at: string;
  /** This account made it, so it can take it back. */
  mine: boolean;
  /** How many riders, signed in or not, reacted each way. */
  reactions: Record<Reaction, number>;
  /** Which of those this viewer gave. */
  reacted: Record<Reaction, boolean>;
  /** Browser only, never sent by the server: a post shown before the server has confirmed it. */
  pending?: boolean;
  /** Browser only: the id the row first had, so confirming it does not remount it. */
  ref?: string;
  /** Browser only: the rider's own copy of their photo, shown instead of fetching it back. */
  localPhoto?: string;
};

export type CheckInProblem =
  | "signin"
  | "denied"
  | "unsupported"
  | "imprecise"
  | "far"
  | "unknown"
  | "empty"
  | "language"
  | "react"
  | "muted"
  | "closed"
  | "photo"
  | "failed";

/** The shortest honest way to say how long ago, in whole minutes. */
export function minutesSince(iso: string, now: number): number {
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return 0;
  return Math.max(0, Math.floor((now - at) / 60_000));
}

/** Trims, collapses runs of blank lines, and cuts to the limit by characters, not UTF-16 units. */
export function cleanMessage(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = [...value.replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim()]
    .slice(0, MAX_CHECK_IN_MESSAGE)
    .join("")
    .trim();
  return text.length > 0 ? text : null;
}

/** JPEG files start FF D8 FF. The browser re-encodes every photo, so anything else is refused. */
export function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

/** First name for display. The rest of the name is never sent to other riders. */
export function firstName(name: string | null | undefined): string {
  const word = (name ?? "").trim().split(/\s+/)[0];
  return word ? [...word].slice(0, 20).join("") : "Rider";
}
