import { localMoment } from "@/lib/schedule";

/** Client-safe. No server imports here. */

/**
 * How often an account comes back. A day counts once, in the person's own time zone, the first time
 * the app opens that day. `day` values are `YYYY-MM-DD`.
 */
export type StreakRecord = {
  /** Consecutive days ending at `lastDay`. */
  current: number;
  longest: number;
  /** Every distinct day the app was opened. */
  totalDays: number;
  lastDay: string | null;
};

export const EMPTY_STREAK: StreakRecord = { current: 0, longest: 0, totalDays: 0, lastDay: null };

/** What the browser shows. `current` is already 0 when the run was broken. */
export type StreakView = StreakRecord & {
  /** True when today is already counted. When false, opening the app today extends the run. */
  today: boolean;
  /** True only on the response to the visit that raised `current`. */
  advanced: boolean;
};

/** Streak lengths worth a small celebration. */
export const MILESTONES: readonly number[] = [3, 7, 14, 30, 60, 100, 180, 365];

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export function isDay(value: unknown): value is string {
  return typeof value === "string" && DAY.test(value);
}

/** Whole days from `from` to `to`. Both are `YYYY-MM-DD`, so UTC math has no daylight-saving drift. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** Records a visit on `today`. Opening the app again the same day changes nothing. */
export function recordDay(record: StreakRecord, today: string): { record: StreakRecord; advanced: boolean } {
  if (record.lastDay === null) {
    return { record: { current: 1, longest: Math.max(1, record.longest), totalDays: 1, lastDay: today }, advanced: true };
  }
  // A clock or time zone that moved backward is the same visit, not a new day.
  const gap = daysBetween(record.lastDay, today);
  if (gap <= 0) return { record, advanced: false };
  const current = gap === 1 ? record.current + 1 : 1;
  return {
    record: {
      current,
      longest: Math.max(record.longest, current),
      totalDays: record.totalDays + 1,
      lastDay: today,
    },
    advanced: true,
  };
}

/** The run as of `today`. A run that skipped a full day shows 0 until the next visit restarts it. */
export function viewStreak(record: StreakRecord, today: string, advanced = false): StreakView {
  const live = record.lastDay !== null && daysBetween(record.lastDay, today) <= 1;
  return {
    ...record,
    current: live ? record.current : 0,
    today: record.lastDay !== null && daysBetween(record.lastDay, today) <= 0,
    advanced,
  };
}

/** The next milestone above `current`, or null once every one is passed. */
export function nextMilestone(current: number): number | null {
  return MILESTONES.find((milestone) => milestone > current) ?? null;
}

export function isMilestone(current: number): boolean {
  return MILESTONES.includes(current);
}

/** Today's date in a time zone. */
export function dayIn(timeZone: string, at: Date = new Date()): string {
  return localMoment(timeZone, at).date;
}

/** Level thresholds: the streak length that reaches each level. Level 0 starts at one day. */
export const LEVEL_STARTS: readonly number[] = [1, 3, 7, 14, 30, 100];

/** 0 (just started) to 5 (a hundred days). Meaningful only when `current` is at least 1. */
export function streakLevel(current: number): number {
  let level = 0;
  LEVEL_STARTS.forEach((start, index) => {
    if (current >= start) level = index;
  });
  return level;
}
