/**
 * The dollar-peso rate through time. Client-safe, like `rate.ts`: the browser asks the
 * feed for one daily range and draws it. The keyless plan reaches back 30 days at one
 * rate per day, and weekends have none, so a month is about twenty points.
 */

import type { Rate } from "@/lib/rate";

export const TREND_URL = "https://api.exchangerate.dev/v1/range";
/** The free plan allows 30 days back. One day short, so a clock skew never trips the gate. */
export const TREND_DAYS = 29;
/** A daily series changes once a day, so it is fetched about as often as that. */
export const TREND_REFRESH_MS = 6 * 60 * 60_000;

/** The spans a rider can pick, in calendar days ending on the newest point. */
export const TREND_SPANS = [7, 30] as const;
export type TrendSpan = (typeof TREND_SPANS)[number];

export type TrendPoint = {
  /** UTC calendar day, `YYYY-MM-DD`. */
  day: string;
  /** Pesos for one dollar. */
  mxn: number;
};

const DAY_MS = 86_400_000;
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Midnight UTC of a `YYYY-MM-DD` day. NaN when it is not one. */
export function dayTime(day: string): number {
  return DAY_PATTERN.test(day) ? Date.parse(`${day}T00:00:00Z`) : Number.NaN;
}

export function trendUrl(now: Date = new Date()): string {
  const start = isoDay(new Date(now.getTime() - TREND_DAYS * DAY_MS));
  const end = isoDay(now);
  return `${TREND_URL}?base=USD&symbols=MXN&start_date=${start}&end_date=${end}`;
}

export function isTrendPoint(value: unknown): value is TrendPoint {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.day === "string" &&
    !Number.isNaN(dayTime(record.day)) &&
    typeof record.mxn === "number" &&
    Number.isFinite(record.mxn) &&
    record.mxn >= 1 &&
    record.mxn <= 1000
  );
}

/** Reads the feed's range answer: oldest first, one point per day, bad rows dropped. */
export function parseTrend(body: unknown): TrendPoint[] {
  const rows = typeof body === "object" && body !== null ? (body as { data?: unknown }).data : null;
  if (!Array.isArray(rows)) return [];
  const byDay = new Map<string, TrendPoint>();
  for (const row of rows) {
    if (typeof row !== "object" || row === null) continue;
    const record = row as { date?: unknown; rates?: { MXN?: unknown } | null };
    const point = { day: record.date, mxn: record.rates?.MXN };
    if (isTrendPoint(point)) byDay.set(point.day, point);
  }
  return [...byDay.values()].sort((a, b) => dayTime(a.day) - dayTime(b.day));
}

export async function fetchTrend(signal?: AbortSignal): Promise<TrendPoint[]> {
  const response = await fetch(trendUrl(), { signal });
  if (!response.ok) throw new Error(`Trend request failed (${response.status})`);
  const points = parseTrend(await response.json());
  if (points.length < 2) throw new Error("The history was not usable.");
  return points;
}

/**
 * A live quote ends the line on the number the converter shows. A daily reference is
 * already the newest point, so it is left alone.
 */
export function withLatest(points: readonly TrendPoint[], rate: Rate | null): TrendPoint[] {
  if (!rate || !rate.live || points.length === 0) return [...points];
  const day = rate.asOf.slice(0, 10);
  const last = points[points.length - 1];
  if (Number.isNaN(dayTime(day)) || dayTime(day) < dayTime(last.day)) return [...points];
  const latest = { day, mxn: rate.mxn };
  return day === last.day ? [...points.slice(0, -1), latest] : [...points, latest];
}

/** The newest `span` calendar days, counting back from the last point. */
export function lastDays(points: readonly TrendPoint[], span: number): TrendPoint[] {
  if (points.length === 0) return [];
  const end = dayTime(points[points.length - 1].day);
  const cutoff = end - (span - 1) * DAY_MS;
  return points.filter((point) => dayTime(point.day) >= cutoff);
}

export type TrendChange = { delta: number; percent: number };

/** How far point `index` sits from the first point. Null with nothing to compare. */
export function trendChange(points: readonly TrendPoint[], index: number): TrendChange | null {
  if (points.length < 2 || index < 0 || index >= points.length) return null;
  const first = points[0].mxn;
  const delta = points[index].mxn - first;
  return { delta, percent: delta / first };
}

export type TrendShape = {
  /** SVG path for the line, in a 100 by 100 box. */
  line: string;
  /** The same line closed down to the baseline, for the soft fill. */
  area: string;
  /** Each point as a fraction of the width and of the height, top is 0. */
  xs: number[];
  ys: number[];
};

/** Room above and below the line, as a fraction of the height, so a marker never clips. */
const PAD = 0.14;

/**
 * Lays the points out by date, so a weekend shows as the gap it is. The line is
 * stretched to its own highs and lows: it shows the shape of the move, not its size, and
 * the number above the chart says how big the move was.
 */
export function trendShape(points: readonly TrendPoint[]): TrendShape {
  if (points.length === 0) return { line: "", area: "", xs: [], ys: [] };
  const times = points.map((point) => dayTime(point.day));
  const values = points.map((point) => point.mxn);
  const t0 = times[0];
  const span = times[times.length - 1] - t0;
  const low = Math.min(...values);
  const high = Math.max(...values);
  const xs = times.map((time) => (span === 0 ? 0.5 : (time - t0) / span));
  const ys = values.map((value) =>
    high === low ? 0.5 : PAD + (1 - (value - low) / (high - low)) * (1 - 2 * PAD),
  );
  const at = (value: number) => Math.round(value * 1000) / 10;
  const line = xs.map((x, i) => `${i === 0 ? "M" : "L"}${at(x)} ${at(ys[i])}`).join(" ");
  const area = `${line} L${at(xs[xs.length - 1])} 100 L${at(xs[0])} 100 Z`;
  return { line, area, xs, ys };
}

/** The point whose x sits closest to `ratio` (0 at the left edge, 1 at the right). */
export function nearestPoint(xs: readonly number[], ratio: number): number {
  let best = 0;
  for (let i = 1; i < xs.length; i++) {
    if (Math.abs(xs[i] - ratio) < Math.abs(xs[best] - ratio)) best = i;
  }
  return best;
}
