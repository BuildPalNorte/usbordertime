/** Client-safe. Every time on the admin pages is read in Central time, the border's clock, and says so. */

const ZONE = "America/Chicago";

const SHORT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: ZONE });
const SHORT_YEAR = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: ZONE });
const CLOCK = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
  timeZone: ZONE,
});
const CLOCK_YEAR = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
  timeZone: ZONE,
});
const YEAR = new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone: ZONE });

function parse(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "Oct 21, 2:34 AM CDT". The year appears only when it is not the current one. */
export function formatMoment(value: string | null | undefined, now: number): string {
  const date = parse(value);
  if (!date) return "Never";
  const sameYear = YEAR.format(date) === YEAR.format(new Date(now));
  return (sameYear ? CLOCK : CLOCK_YEAR).format(date);
}

/** "Oct 21". A calendar day string like `2026-10-21` is read as that day, not shifted by the zone. */
export function formatDay(day: string, now: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return day;
  const sameYear = date.getUTCFullYear() === Number(YEAR.format(new Date(now)));
  return (sameYear ? SHORT : SHORT_YEAR).format(new Date(`${day}T18:00:00Z`));
}

/** "5m ago", "3h ago", "2d ago". Older than a month falls back to the date. */
export function formatAgo(value: string | null | undefined, now: number): string {
  const date = parse(value);
  if (!date) return "Never";
  const seconds = Math.max(0, Math.round((now - date.getTime()) / 1000));
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 31) return `${days}d ago`;
  return (YEAR.format(date) === YEAR.format(new Date(now)) ? SHORT : SHORT_YEAR).format(date);
}
