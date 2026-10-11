import type { Mode } from "@/lib/ports";

/** Hourly usual waits for one crossing. Index 0 is midnight at the port. */
export type LaneAverages = {
  portNumber: string;
  date: string;
  hours: Record<Mode, (number | null)[]>;
};

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
