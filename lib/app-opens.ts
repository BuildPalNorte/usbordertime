/** Client-safe. A use is one open of the app, by an account or a guest, counted on Central calendar days. */

export const OPEN_SPAN_DAYS = 366;

export const OPEN_RANGES = [
  { id: "today", label: "Today", days: 1 },
  { id: "7", label: "7 days", days: 7 },
  { id: "30", label: "30 days", days: 30 },
  { id: "90", label: "90 days", days: 90 },
] as const;

export type OpenRangeId = (typeof OPEN_RANGES)[number]["id"];

export type OpenDay = {
  day: string;
  /** Distinct accounts that opened the app that day. */
  people: number;
  /** Opens by those accounts. */
  opens: number;
  /** Opens by browsers that still have no account. */
  guestOpens?: number;
  /** Distinct guests that opened the app that day. */
  guestPeople?: number;
};

/** Account opens (`opens`, `people`) and guest opens from `from` through `to`, inclusive. */
export type AppOpens = {
  from: string;
  to: string;
  people: number;
  opens: number;
  /** Distinct guests across the whole span. */
  guests?: number;
  /** Every guest open in the span. */
  guestOpens?: number;
  days: OpenDay[];
};

/** Lays guest opens onto the account days. A day the accounts query did not return stays at zero. */
export function addGuestOpens(
  report: AppOpens,
  guest: { guests: number; opens: number; days: { day: string; opens: number; guests: number }[] },
): AppOpens {
  const byDay = new Map(guest.days.map((day) => [day.day, day]));
  return {
    ...report,
    guests: guest.guests,
    guestOpens: guest.opens,
    days: report.days.map((day) => {
      const match = byDay.get(day.day);
      return match ? { ...day, guestOpens: match.opens, guestPeople: match.guests } : { ...day, guestOpens: 0, guestPeople: 0 };
    }),
  };
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

export function isOpenDay(value: string): boolean {
  if (!DAY.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** Moves a calendar day by whole days. `2026-03-01` minus 7 lands in February. */
export function shiftOpenDay(day: string, delta: number): string {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date + delta)).toISOString().slice(0, 10);
}

export function openSpanLength(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  return Math.round((end - start) / DAY_MS) + 1;
}

/** Inclusive Central span ending on `end`, `length` days long. */
export function recentOpenRange(end: string, length: number): { from: string; to: string } {
  return { from: shiftOpenDay(end, -(length - 1)), to: end };
}

/** Why `from` and `to` cannot be read, or null when they can. */
export function openRangeIssue(from: string, to: string): string | null {
  if (!isOpenDay(from) || !isOpenDay(to)) return "Pick a start and an end.";
  if (from > to) return "The start has to be on or before the end.";
  if (openSpanLength(from, to) > OPEN_SPAN_DAYS) return "Pick a year or less.";
  return null;
}

export function parseOpenRange(from: string | null, to: string | null): { from: string; to: string } | null {
  if (!from || !to || openRangeIssue(from, to)) return null;
  return { from, to };
}

/** The preset whose window is exactly `from` through `to` ending today, or null when the dates are custom. */
export function matchingOpenRange(from: string, to: string, today: string): OpenRangeId | null {
  if (to !== today) return null;
  return OPEN_RANGES.find((range) => recentOpenRange(today, range.days).from === from)?.id ?? null;
}

/** Every calendar day from `from` through `to`, with zeros where nothing was counted. */
export function fillOpenDays(from: string, to: string, rows: OpenDay[]): OpenDay[] {
  const byDay = new Map(rows.map((row) => [row.day, row]));
  const length = openSpanLength(from, to);
  return Array.from({ length }, (_, index) => {
    const day = shiftOpenDay(from, index);
    return byDay.get(day) ?? { day, people: 0, opens: 0 };
  });
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

export function parseAppOpens(body: unknown): AppOpens | null {
  const entry = body as Partial<AppOpens> | null;
  if (!entry || typeof entry.from !== "string" || typeof entry.to !== "string") return null;
  if (openRangeIssue(entry.from, entry.to)) return null;
  if (!isCount(entry.people) || !isCount(entry.opens) || !Array.isArray(entry.days)) return null;
  const guests = entry.guests === undefined ? undefined : isCount(entry.guests) ? entry.guests : null;
  const guestOpens = entry.guestOpens === undefined ? undefined : isCount(entry.guestOpens) ? entry.guestOpens : null;
  if (guests === null || guestOpens === null) return null;
  const days: OpenDay[] = [];
  for (const row of entry.days) {
    const day = row as Partial<OpenDay> | null;
    if (!day || typeof day.day !== "string" || !isOpenDay(day.day) || !isCount(day.people) || !isCount(day.opens)) {
      return null;
    }
    const guestOpens = day.guestOpens === undefined ? undefined : isCount(day.guestOpens) ? day.guestOpens : null;
    const guestPeople = day.guestPeople === undefined ? undefined : isCount(day.guestPeople) ? day.guestPeople : null;
    if (guestOpens === null || guestPeople === null) return null;
    days.push({
      day: day.day,
      people: day.people,
      opens: day.opens,
      ...(guestOpens === undefined ? {} : { guestOpens }),
      ...(guestPeople === undefined ? {} : { guestPeople }),
    });
  }
  return {
    from: entry.from,
    to: entry.to,
    people: entry.people,
    opens: entry.opens,
    ...(guests === undefined ? {} : { guests }),
    ...(guestOpens === undefined ? {} : { guestOpens }),
    days,
  };
}
