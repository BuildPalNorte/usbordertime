import { isMode, type Mode } from "@/lib/ports";

/** Client-safe. No server imports here. */

/** One wait alert: tell me when this lane at this crossing drops under `threshold` minutes. */
export type WaitAlert = {
  portNumber: string;
  mode: Mode;
  threshold: number;
};

/** The waits the lane card offers. The server accepts any whole number from MIN to MAX. */
export const ALERT_PRESETS: readonly number[] = [10, 15, 20, 30, 45];

export const MIN_THRESHOLD = 5;
export const MAX_THRESHOLD = 180;
export const MAX_ALERTS = 30;

/**
 * Once an alert has fired, the wait has to climb this far past the threshold before it can fire
 * again. Without the gap, a lane hovering at 19 and 21 minutes would notify on every dip.
 */
export const REARM_SLACK = 5;

const PORT = /^[A-Za-z0-9]{1,12}$/;

export function isPortNumber(value: unknown): value is string {
  return typeof value === "string" && PORT.test(value);
}

export function isThreshold(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= MIN_THRESHOLD &&
    value <= MAX_THRESHOLD
  );
}

/** The body of `PUT /api/alerts`. Null when the shape is wrong. */
export function parseAlert(value: unknown): WaitAlert | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (!isPortNumber(record.portNumber) || !isMode(record.mode) || !isThreshold(record.threshold)) {
    return null;
  }
  return { portNumber: record.portNumber, mode: record.mode, threshold: record.threshold };
}

/** A device's Web Push address, as `PushSubscription.toJSON()` returns it. */
export type PushDevice = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

/**
 * Only the push services browsers actually use. The server posts to this address, so an
 * arbitrary URL from the client must not get through.
 */
const PUSH_HOSTS = [
  "fcm.googleapis.com",
  "push.services.mozilla.com",
  "push.apple.com",
  "notify.windows.com",
];

export function parsePushDevice(value: unknown): PushDevice | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const keys = record.keys as Record<string, unknown> | undefined;
  if (typeof record.endpoint !== "string" || record.endpoint.length > 1000) return null;
  if (!keys || typeof keys.p256dh !== "string" || typeof keys.auth !== "string") return null;
  if (keys.p256dh.length > 200 || keys.auth.length > 100) return null;

  let url: URL;
  try {
    url = new URL(record.endpoint);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase();
  if (!PUSH_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))) return null;

  return { endpoint: record.endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } };
}

const DEVICE_KEY = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A stable id for this browser, so a new push address replaces the old one instead of stacking. */
export function parseDeviceKey(value: unknown): string | null {
  return typeof value === "string" && DEVICE_KEY.test(value) ? value : null;
}

export function alertKey(portNumber: string, mode: Mode): string {
  return `${portNumber}:${mode}`;
}
