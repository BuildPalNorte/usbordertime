import { describe, expect, it } from "vitest";
import {
  isTrendPoint,
  lastDays,
  nearestPoint,
  parseTrend,
  trendChange,
  trendShape,
  trendUrl,
  withLatest,
  type TrendPoint,
} from "@/lib/rate-trend";

const row = (date: string, mxn: unknown) => ({
  date,
  rates: { MXN: mxn },
  source: "ecb_daily",
  is_forward_filled: false,
});

const week: TrendPoint[] = [
  { day: "2026-10-26", mxn: 18.0 },
  { day: "2026-10-27", mxn: 18.2 },
  { day: "2026-10-28", mxn: 18.1 },
  { day: "2026-10-29", mxn: 18.4 },
  { day: "2026-10-30", mxn: 18.9 },
];

describe("trendUrl", () => {
  it("asks for 29 days back, inside the free plan's 30", () => {
    const url = trendUrl(new Date("2026-11-01T08:00:00Z"));
    expect(url).toContain("/v1/range?");
    expect(url).toContain("base=USD&symbols=MXN");
    expect(url).toContain("start_date=2026-10-03");
    expect(url).toContain("end_date=2026-11-01");
  });
});

describe("parseTrend", () => {
  it("reads the range answer oldest first, whatever order it came in", () => {
    const points = parseTrend({
      result: "success",
      data: [row("2026-10-06", 17.9445), row("2026-10-05", 18.1496)],
    });
    expect(points).toEqual([
      { day: "2026-10-05", mxn: 18.1496 },
      { day: "2026-10-06", mxn: 17.9445 },
    ]);
  });

  it("drops rows that are not a usable day and rate, and repeats of a day", () => {
    const points = parseTrend({
      data: [
        row("2026-10-05", 18.1),
        row("2026-10-05", 18.2),
        row("soon", 18.3),
        row("2026-10-07", "18.4"),
        row("2026-10-08", 0),
        row("2026-10-09", 5000),
        null,
        { date: "2026-10-12" },
      ],
    });
    expect(points).toEqual([{ day: "2026-10-05", mxn: 18.2 }]);
  });

  it("is empty for anything that is not a range answer", () => {
    expect(parseTrend(null)).toEqual([]);
    expect(parseTrend({})).toEqual([]);
    expect(parseTrend({ data: "no" })).toEqual([]);
  });
});

describe("isTrendPoint", () => {
  it("accepts what parseTrend makes and nothing looser", () => {
    expect(isTrendPoint({ day: "2026-10-05", mxn: 18.1 })).toBe(true);
    expect(isTrendPoint({ day: "2026-13-45", mxn: 18.1 })).toBe(false);
    expect(isTrendPoint({ day: "2026-10-05", mxn: 0.05 })).toBe(false);
    expect(isTrendPoint({ day: "2026-10-05" })).toBe(false);
    expect(isTrendPoint("2026-10-05")).toBe(false);
  });
});

describe("withLatest", () => {
  it("ends a live day on the converter's own number", () => {
    const live = { mxn: 18.95, asOf: "2026-10-30T14:44:10Z", live: true };
    expect(withLatest(week, live).at(-1)).toEqual({ day: "2026-10-30", mxn: 18.95 });
    expect(withLatest(week, live)).toHaveLength(week.length);
  });

  it("adds a new day when the live quote is past the last point", () => {
    const live = { mxn: 18.95, asOf: "2026-11-02T14:44:10Z", live: true };
    const next = withLatest(week, live);
    expect(next).toHaveLength(week.length + 1);
    expect(next.at(-1)).toEqual({ day: "2026-11-02", mxn: 18.95 });
  });

  it("leaves a daily reference and a stale quote alone", () => {
    const daily = { mxn: 18.9, asOf: "2026-10-30T00:00:00Z", live: false };
    const old = { mxn: 18.0, asOf: "2026-10-01T00:00:00Z", live: true };
    expect(withLatest(week, daily)).toEqual(week);
    expect(withLatest(week, old)).toEqual(week);
    expect(withLatest(week, null)).toEqual(week);
    expect(withLatest([], { mxn: 18, asOf: "2026-10-30T00:00:00Z", live: true })).toEqual([]);
  });
});

describe("lastDays", () => {
  it("counts calendar days back from the newest point", () => {
    expect(lastDays(week, 3).map((p) => p.day)).toEqual(["2026-10-28", "2026-10-29", "2026-10-30"]);
    expect(lastDays(week, 30)).toEqual(week);
    expect(lastDays([], 7)).toEqual([]);
  });
});

describe("trendChange", () => {
  it("measures a point against the first one", () => {
    const change = trendChange(week, 4);
    expect(change?.delta).toBeCloseTo(0.9, 6);
    expect(change?.percent).toBeCloseTo(0.05, 6);
    expect(trendChange(week, 0)).toEqual({ delta: 0, percent: 0 });
  });

  it("is null with nothing to compare", () => {
    expect(trendChange(week.slice(0, 1), 0)).toBeNull();
    expect(trendChange(week, 9)).toBeNull();
    expect(trendChange(week, -1)).toBeNull();
  });
});

describe("trendShape", () => {
  it("puts the lowest rate near the bottom and the highest near the top", () => {
    const { xs, ys } = trendShape(week);
    expect(xs[0]).toBe(0);
    expect(xs.at(-1)).toBe(1);
    expect(ys[0]).toBeGreaterThan(ys[4]);
    expect(Math.min(...ys)).toBeGreaterThan(0);
    expect(Math.max(...ys)).toBeLessThan(1);
  });

  it("spaces points by date, so a weekend is a gap", () => {
    const { xs } = trendShape([
      { day: "2026-10-29", mxn: 18 },
      { day: "2026-10-30", mxn: 18.1 },
      { day: "2026-11-02", mxn: 18.2 },
    ]);
    expect(xs[1]).toBeCloseTo(1 / 4, 6);
    expect(xs[2]).toBe(1);
  });

  it("centers a flat series and a single point", () => {
    expect(trendShape([week[0], { ...week[1], mxn: week[0].mxn }]).ys).toEqual([0.5, 0.5]);
    expect(trendShape([week[0]]).xs).toEqual([0.5]);
    expect(trendShape([])).toEqual({ line: "", area: "", xs: [], ys: [] });
  });

  it("closes the fill down to the baseline", () => {
    const { line, area } = trendShape(week);
    expect(line.startsWith("M0 ")).toBe(true);
    expect(area.startsWith(line)).toBe(true);
    expect(area.endsWith("Z")).toBe(true);
  });
});

describe("nearestPoint", () => {
  it("finds the point closest to a place on the chart", () => {
    const xs = [0, 0.25, 0.5, 1];
    expect(nearestPoint(xs, 0)).toBe(0);
    expect(nearestPoint(xs, 0.3)).toBe(1);
    expect(nearestPoint(xs, 0.8)).toBe(3);
    expect(nearestPoint(xs, 1)).toBe(3);
  });
});
