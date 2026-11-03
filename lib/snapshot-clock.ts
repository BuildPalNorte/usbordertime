import type { BorderWaitTimes, LaneReading, PortWaitTime } from "@/lib/border-wait-times";
import type { Locale } from "@/lib/i18n";

const CLOCK_TAG: Record<Locale, string> = { en: "en-US", es: "es-MX" };

/**
 * Abbreviations CBP appends to a lane's `update_time`. Mountain is last: Arizona
 * stays on MST while America/Denver springs forward, so a coastal stamp is safer.
 */
const ZONE_BY_ABBR: Record<string, string> = {
  EST: "America/New_York",
  EDT: "America/New_York",
  CST: "America/Chicago",
  CDT: "America/Chicago",
  PST: "America/Los_Angeles",
  PDT: "America/Los_Angeles",
  MST: "America/Denver",
  MDT: "America/Denver",
};

const STEADY_ABBR = new Set(["EST", "EDT", "CST", "CDT", "PST", "PDT"]);

/**
 * When CBP assembled this snapshot, as one instant. Each row's `time` is that
 * port's wall clock, so the first row is often an hour off for everyone else.
 * A lane `update_time` names the zone that clock belongs to.
 */
export function snapshotInstant(ports: readonly PortWaitTime[]): Date | null {
  let mountain: Date | null = null;
  for (const port of ports) {
    const zone = zoneOf(port);
    if (!zone) continue;
    const instant = wallClockToUtc(port.date, port.time, zone.iana);
    if (!instant) continue;
    if (zone.steady) return instant;
    mountain ??= instant;
  }
  return mountain;
}

/**
 * That instant in `timeZone`, or in the runtime's zone when omitted.
 * The wallet passes none, so a signed-in rider sees their own clock.
 */
export function formatViewerTime(instant: Date, locale: Locale, timeZone?: string): string {
  return new Intl.DateTimeFormat(CLOCK_TAG[locale], {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(instant);
}

/** The clock under the wallet title: CBP's stamp when we can place it, otherwise the fetch. */
export function viewerUpdatedAt(
  snapshot: Pick<BorderWaitTimes, "ports" | "fetchedAt">,
  locale: Locale,
  timeZone?: string,
): string | null {
  const fetched = new Date(snapshot.fetchedAt);
  const instant = snapshotInstant(snapshot.ports) ?? (Number.isNaN(fetched.getTime()) ? null : fetched);
  if (!instant) return null;
  return formatViewerTime(instant, locale, timeZone);
}

function zoneOf(port: PortWaitTime): { iana: string; steady: boolean } | null {
  for (const reading of readings(port)) {
    const abbr = reading.updateTime?.match(/\b([ECMP][DS]T)\b/)?.[1];
    const iana = abbr ? ZONE_BY_ABBR[abbr] : undefined;
    if (!abbr || !iana) continue;
    return { iana, steady: STEADY_ABBR.has(abbr) };
  }
  return null;
}

function readings(port: PortWaitTime): LaneReading[] {
  return [
    port.passenger.standard,
    port.passenger.ready,
    port.passenger.nexusSentri,
    port.pedestrian.standard,
    port.pedestrian.ready,
    port.commercial.standard,
    port.commercial.fast,
  ];
}

/** `MM/DD/YYYY` and `HH:MM:SS` as read on the wall in `timeZone`. */
function wallClockToUtc(date: string, time: string, timeZone: string): Date | null {
  const day = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(date.trim());
  const clock = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(time.trim());
  if (!day || !clock) return null;
  const year = Number(day[3]);
  const month = Number(day[1]);
  const dateNum = Number(day[2]);
  const hour = Number(clock[1]);
  const minute = Number(clock[2]);
  const second = Number(clock[3] ?? 0);
  if (month < 1 || month > 12 || dateNum < 1 || dateNum > 31) return null;
  if (hour > 23 || minute > 59 || second > 59) return null;

  const utcGuess = Date.UTC(year, month - 1, dateNum, hour, minute, second);
  const first = zoneOffsetMs(timeZone, utcGuess);
  if (first === null) return null;
  const adjusted = utcGuess - first;
  const secondOffset = zoneOffsetMs(timeZone, adjusted);
  if (secondOffset === null) return null;
  return new Date(utcGuess - secondOffset);
}

/** Milliseconds to add to UTC to reach the wall clock in `timeZone`. */
function zoneOffsetMs(timeZone: string, utcMs: number): number | null {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).formatToParts(new Date(utcMs));
    const bag: Record<string, string> = {};
    for (const part of parts) bag[part.type] = part.value;
    let hour = Number(bag.hour);
    if (hour === 24) hour = 0;
    const asUtc = Date.UTC(
      Number(bag.year),
      Number(bag.month) - 1,
      Number(bag.day),
      hour,
      Number(bag.minute),
      Number(bag.second),
    );
    return asUtc - utcMs;
  } catch {
    return null;
  }
}
