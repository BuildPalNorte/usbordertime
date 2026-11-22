import type { Mode } from "@/lib/ports";

/** Hourly usual waits for one crossing. Index 0 is midnight at the port. */
export type LaneAverages = {
  portNumber: string;
  date: string;
  /** Usual wait for that hour. `0` is a real average. */
  hours: Record<Mode, (number | null)[]>;
  /** Highest wait CBP lists for that hour. */
  high: Record<Mode, (number | null)[]>;
  /**
   * Median usual wait for each hour over the same weekday in recent weeks. An hour that fewer than
   * two of those weeks published is blank. Absent on an older cached response.
   */
  typical?: Record<Mode, (number | null)[]>;
};

/** A stretch of hours that stays near the quietest usual wait. `end` is included. */
export type QuietWindow = {
  start: number;
  end: number;
  minutes: number;
  /** Published hours all sit within a few minutes of each other. */
  flat: boolean;
};

/** Hours within this many minutes of the quietest hour still count as that stretch. */
const QUIET_SLACK = 8;
/** A recommendation longer than this names a shorter slice that still holds the quietest hour. */
const QUIET_CAP = 6;

/**
 * The best time to cross, from CBP's hourly averages.
 * Neighbors within 8 minutes join the quietest hour. A day that barely varies says so.
 */
export function quietestWindow(hours: readonly (number | null)[] | undefined): QuietWindow | null {
  if (!hours) return null;
  const known = hours.filter((value): value is number => value != null);
  if (known.length === 0) return null;
  const min = Math.min(...known);
  const max = Math.max(...known);
  if (known.length >= 18 && max - min <= QUIET_SLACK) {
    const sum = known.reduce((total, value) => total + value, 0);
    return { start: 0, end: 23, minutes: Math.round(sum / known.length), flat: true };
  }

  let minAt = -1;
  hours.forEach((value, hour) => {
    if (value == null || value > min) return;
    if (minAt < 0) minAt = hour;
  });
  if (minAt < 0) return null;

  const ceiling = min + QUIET_SLACK;
  let start = minAt;
  let end = minAt;
  while (start > 0 && hours[start - 1] != null && hours[start - 1]! <= ceiling) start -= 1;
  while (end < hours.length - 1 && hours[end + 1] != null && hours[end + 1]! <= ceiling) end += 1;

  if (end - start + 1 > QUIET_CAP) {
    let bestStart = minAt;
    let bestAvg = Infinity;
    const last = end - QUIET_CAP + 1;
    for (let candidate = start; candidate <= last; candidate += 1) {
      const sliceEnd = candidate + QUIET_CAP - 1;
      if (minAt < candidate || minAt > sliceEnd) continue;
      let sum = 0;
      for (let hour = candidate; hour <= sliceEnd; hour += 1) sum += hours[hour] ?? 0;
      const avg = sum / QUIET_CAP;
      if (avg < bestAvg) {
        bestAvg = avg;
        bestStart = candidate;
      }
    }
    start = bestStart;
    end = bestStart + QUIET_CAP - 1;
  }

  let sum = 0;
  for (let hour = start; hour <= end; hour += 1) sum += hours[hour] ?? 0;
  return { start, end, minutes: Math.round(sum / (end - start + 1)), flat: false };
}

/** Usual wait for one hour, and the high CBP lists when it sits above that usual wait. */
export type UsualWait = {
  minutes: number;
  high: number | null;
};

/**
 * The usual wait for this hour, with the high for that same hour.
 * CBP leaves later hours blank, so a missing hour uses the latest earlier one.
 * `0` is a real average and is kept. A high that is not above the usual wait is left off.
 */
export function usualForHour(
  hours: readonly (number | null)[] | undefined,
  high: readonly (number | null)[] | undefined,
  hour: number | null,
): UsualWait | null {
  if (!hours || hour === null) return null;
  const start = Math.min(23, Math.max(0, hour));
  for (let index = start; index >= 0; index -= 1) {
    const value = hours[index];
    if (value == null) continue;
    const peak = high?.[index];
    return { minutes: value, high: peak != null && peak > value ? peak : null };
  }
  return null;
}

/**
 * The usual wait for this hour. CBP leaves later hours blank, so a missing
 * hour uses the latest earlier one. `0` is a real average and is kept.
 */
export function averageForHour(
  hours: readonly (number | null)[] | undefined,
  hour: number | null,
): number | null {
  return usualForHour(hours, undefined, hour)?.minutes ?? null;
}

/** Hour from a CBP clock such as `19:13:19`. Null when the clock is missing. */
export function hourFromClock(time: string): number | null {
  const match = /^(\d{1,2})/.exec(time.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return null;
  return hour;
}

/** Minutes after midnight from a CBP clock such as `19:13:19`. Null when the clock is missing. */
export function minutesFromClock(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})/.exec(time.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
}

/** A change smaller than this many minutes is not worth an arrow. */
export const TREND_FLOOR = 5;

export type Trend = "up" | "down" | "steady";

/** Up or down once a change reaches the floor, steady otherwise. */
export function trendOf(change: number): Trend {
  if (change >= TREND_FLOOR) return "up";
  if (change <= -TREND_FLOOR) return "down";
  return "steady";
}

/** What the wait is expected to do over the next hour. */
export type Outlook = {
  /** Expected posted wait 30 minutes from now. */
  in30: number;
  /** Expected posted wait 60 minutes from now. Null when that hour has no typical wait. */
  in60: number | null;
  /** The arrow for the card: `d30` decides, and `d60` takes over only while `d30` is steady. */
  trend: Trend;
  /** In 30 minutes minus the live wait. */
  d30: number;
  /** In 60 minutes minus the live wait. Null when there is no 60 minute estimate. */
  d60: number | null;
};

/**
 * Where the wait is expected to go. The live wait carries today's offset, and the usual wait
 * for the hour of arrival says how the day normally moves from here:
 * `live + (usual then - usual now)`, never below 0.
 * Null without a live wait, or when the typical day lacks this hour or the hour 30 minutes out.
 */
export function outlookFor(
  typical: readonly (number | null)[] | undefined,
  live: number | null,
  clock: string,
): Outlook | null {
  const now = minutesFromClock(clock);
  if (!typical || live === null || now === null) return null;
  const atNow = typical[Math.floor(now / 60) % 24];
  const at30 = typical[Math.floor((now + 30) / 60) % 24];
  const at60 = typical[Math.floor((now + 60) / 60) % 24];
  if (atNow == null || at30 == null) return null;

  const in30 = Math.max(0, Math.round(live + at30 - atNow));
  const in60 = at60 == null ? null : Math.max(0, Math.round(live + at60 - atNow));
  const d30 = in30 - live;
  const d60 = in60 === null ? null : in60 - live;

  let trend = trendOf(d30);
  if (trend === "steady" && d60 !== null) trend = trendOf(d60);
  return { in30, in60, trend, d30, d60 };
}
