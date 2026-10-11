import type { Locale } from "@/lib/i18n";
import { isMode, type Mode } from "@/lib/ports";

/** Client-safe. No server imports here. */

/**
 * "At this time, on these days, tell me the current wait at these bridges."
 * `minute` is minutes after local midnight in `timeZone`. `days` are 0 (Sunday) to 6 (Saturday).
 */
export type Schedule = {
  id: string;
  minute: number;
  days: number[];
  timeZone: string;
  mode: Mode;
  ports: string[];
  enabled: boolean;
};

/** What the browser sends. A missing `id` means a new schedule. */
export type ScheduleInput = Omit<Schedule, "id"> & { id: string | null };

export const MAX_SCHEDULES = 8;
export const MAX_SCHEDULE_PORTS = 6;
/** The time picker moves in steps this size. */
export const SCHEDULE_STEP = 5;
/**
 * A schedule can still send this long after its time, in case a cron run was late.
 * Past that, the day is skipped instead of sending a stale morning report at noon.
 */
export const SEND_WINDOW = 5;

export const ALL_DAYS: readonly number[] = [0, 1, 2, 3, 4, 5, 6];
export const WEEKDAYS: readonly number[] = [1, 2, 3, 4, 5];

const PORT = /^[A-Za-z0-9]{1,12}$/;
const ID = /^[A-Za-z0-9-]{8,40}$/;

export function isScheduleMinute(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 24 * 60 - SCHEDULE_STEP &&
    value % SCHEDULE_STEP === 0
  );
}

export function isTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** The body of `PUT /api/schedules`. Null when the shape is wrong. */
export function parseSchedule(value: unknown): ScheduleInput | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;

  if (!isScheduleMinute(record.minute)) return null;
  if (!isTimeZone(record.timeZone)) return null;
  if (!isMode(record.mode)) return null;
  if (typeof record.enabled !== "boolean") return null;
  if (record.id !== null && record.id !== undefined && !(typeof record.id === "string" && ID.test(record.id))) {
    return null;
  }

  if (!Array.isArray(record.days) || record.days.length === 0 || record.days.length > 7) return null;
  const days = [...new Set(record.days)];
  if (!days.every((day) => typeof day === "number" && Number.isInteger(day) && day >= 0 && day <= 6)) {
    return null;
  }

  if (!Array.isArray(record.ports) || record.ports.length === 0) return null;
  const ports = [...new Set(record.ports)];
  if (ports.length > MAX_SCHEDULE_PORTS) return null;
  if (!ports.every((port) => typeof port === "string" && PORT.test(port))) return null;

  return {
    id: typeof record.id === "string" ? record.id : null,
    minute: record.minute,
    days: (days as number[]).sort((a, b) => a - b),
    timeZone: record.timeZone,
    mode: record.mode,
    ports: ports as string[],
    enabled: record.enabled,
  };
}

export function daysToMask(days: readonly number[]): number {
  return days.reduce((mask, day) => mask | (1 << day), 0);
}

export function maskToDays(mask: number): number[] {
  return ALL_DAYS.filter((day) => (mask & (1 << day)) !== 0);
}

const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export type LocalMoment = {
  /** `YYYY-MM-DD` on the wall clock of that zone. */
  date: string;
  weekday: number;
  minute: number;
};

/** What the clock on the wall says in `timeZone`, so daylight saving never moves a schedule. */
export function localMoment(timeZone: string, at: Date = new Date()): LocalMoment {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(at);
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    date: `${pick("year")}-${pick("month")}-${pick("day")}`,
    weekday: WEEKDAY_INDEX[pick("weekday")] ?? 0,
    minute: Number(pick("hour")) * 60 + Number(pick("minute")),
  };
}

/** Today is one of its days, its time has come, and today's message has not gone out. */
export function isDue(
  schedule: Pick<Schedule, "minute" | "days" | "timeZone">,
  lastSentOn: string | null,
  at: Date = new Date(),
): boolean {
  const now = localMoment(schedule.timeZone, at);
  if (lastSentOn === now.date) return false;
  if (!schedule.days.includes(now.weekday)) return false;
  const late = now.minute - schedule.minute;
  return late >= 0 && late < SEND_WINDOW;
}

const CLOCK_TAG: Record<Locale, string> = { en: "en-US", es: "es-MX" };

export type Clock = { digits: string; period: string | null };

/** `7:30 AM` in English, `7:30 a. m.` in Spanish. The period is split off so a card can set it small. */
export function clockParts(minute: number, locale: Locale): Clock {
  const parts = new Intl.DateTimeFormat(CLOCK_TAG[locale], {
    timeZone: "UTC",
    hour: "numeric",
    minute: "2-digit",
  }).formatToParts(new Date(Date.UTC(2000, 0, 1, Math.floor(minute / 60), minute % 60)));
  const period = parts.find((part) => part.type === "dayPeriod")?.value ?? null;
  const digits = parts
    .filter((part) => part.type !== "dayPeriod")
    .map((part) => part.value)
    .join("")
    .trim();
  return { digits, period };
}

export function clockLabel(minute: number, locale: Locale): string {
  const { digits, period } = clockParts(minute, locale);
  return period ? `${digits} ${period}` : digits;
}

/** `07:30`, the value of a time input. */
export function toTimeValue(minute: number): string {
  const hours = String(Math.floor(minute / 60)).padStart(2, "0");
  const minutes = String(minute % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/** Back from a time input, rounded down to the step. Null when the field is empty. */
export function fromTimeValue(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes - ((hours * 60 + minutes) % SCHEDULE_STEP);
}

/** A one-letter day for the chips, from the browser's own calendar so Spanish reads right. */
export function dayLabel(day: number, locale: Locale, width: "narrow" | "short" | "long"): string {
  // 2023-01-01 was a Sunday.
  return new Intl.DateTimeFormat(CLOCK_TAG[locale], { weekday: width, timeZone: "UTC" }).format(
    new Date(Date.UTC(2023, 0, 1 + day)),
  );
}

export function sameDays(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((day) => b.includes(day));
}
