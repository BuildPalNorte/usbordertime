import type { Mode } from "@/lib/ports";

/** Hourly usual waits for one crossing. Index 0 is midnight at the port. */
export type LaneAverages = {
  portNumber: string;
  date: string;
  /** Usual wait for that hour. `0` is a real average. */
  hours: Record<Mode, (number | null)[]>;
  /** Highest wait CBP lists for that hour. */
  high: Record<Mode, (number | null)[]>;
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

/**
 * The usual wait for this hour. CBP leaves later hours blank, so a missing
 * hour uses the latest earlier one. `0` is a real average and is kept.
 */
export function averageForHour(
  hours: readonly (number | null)[] | undefined,
  hour: number | null,
): number | null {
  if (!hours || hour === null) return null;
  const start = Math.min(23, Math.max(0, hour));
  for (let index = start; index >= 0; index -= 1) {
    const value = hours[index];
    if (value != null) return value;
  }
  return null;
}

/** Hour from a CBP clock such as `19:13:19`. Null when the clock is missing. */
export function hourFromClock(time: string): number | null {
  const match = /^(\d{1,2})/.exec(time.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return null;
  return hour;
}
