import { describe, expect, it } from "vitest";
import { COPY } from "@/lib/i18n";
import { averageForHour, minutesFromClock, outlookFor, trendOf, usualForHour } from "@/lib/lane-averages";

const hours = [null, 20, null, 40];
const high = [null, 50, null, 90];

describe("usualForHour", () => {
  it("reads the usual wait and the high for that hour", () => {
    expect(usualForHour(hours, high, 3)).toEqual({ minutes: 40, high: 90 });
  });

  it("keeps a real zero and drops a high that is not above it", () => {
    expect(usualForHour([0], [0], 0)).toEqual({ minutes: 0, high: null });
    expect(usualForHour([15], [15], 0)).toEqual({ minutes: 15, high: null });
    expect(usualForHour([15], [10], 0)).toEqual({ minutes: 15, high: null });
  });

  it("uses the latest earlier hour when this one is blank, high included", () => {
    expect(usualForHour(hours, high, 2)).toEqual({ minutes: 20, high: 50 });
  });

  it("returns nothing when the clock or the day is missing", () => {
    expect(usualForHour(hours, high, null)).toBeNull();
    expect(usualForHour(undefined, high, 3)).toBeNull();
    expect(usualForHour([null, null], [90, 90], 1)).toBeNull();
  });
});

describe("averageForHour", () => {
  it("still returns only the usual wait", () => {
    expect(averageForHour(hours, 3)).toBe(40);
    expect(averageForHour([0], 0)).toBe(0);
  });
});

describe("average range copy", () => {
  it("shares a unit when both ends are minutes or whole hours", () => {
    expect(COPY.en.averageRangeShort(20, 45)).toBe("avg 20–45 min");
    expect(COPY.en.averageRangeShort(60, 120)).toBe("avg 1–2 hr");
    expect(COPY.es.averageRangeShort(34, 120)).toBe("promedio 34 min–2 h");
    expect(COPY.es.averageRangeShort(75, 150)).toBe("promedio 1 h 15 min–2 h 30 min");
  });

  it("speaks the span from the usual wait to the high", () => {
    expect(COPY.en.averageRangeLabel(34, 120)).toBe(
      "Average wait at this hour, 34 minutes to 2 hours",
    );
    expect(COPY.es.averageRangeLabel(34, 120)).toBe(
      "Espera promedio a esta hora, de 34 minutos a 2 horas",
    );
  });
});

function day(entries: Record<number, number>): (number | null)[] {
  return Array.from({ length: 24 }, (_, hour) => entries[hour] ?? null);
}

describe("minutesFromClock", () => {
  it("reads minutes after midnight", () => {
    expect(minutesFromClock("19:13:19")).toBe(19 * 60 + 13);
    expect(minutesFromClock("00:00:00")).toBe(0);
    expect(minutesFromClock("nope")).toBeNull();
  });
});

describe("trendOf", () => {
  it("needs a change of at least 5 minutes", () => {
    expect(trendOf(5)).toBe("up");
    expect(trendOf(4)).toBe("steady");
    expect(trendOf(-4)).toBe("steady");
    expect(trendOf(-5)).toBe("down");
  });
});

describe("outlookFor", () => {
  const typical = day({ 8: 20, 9: 50, 10: 30, 11: 30 });

  it("keeps the live wait through the first half of an hour and sees the next hour coming", () => {
    // 8:10 -> +30 is still 8:40 (hour 8), +60 is 9:10 (hour 9)
    expect(outlookFor(typical, 25, "08:10:00")).toEqual({
      in30: 25,
      in60: 55,
      trend: "up",
      d30: 0,
      d60: 30,
    });
  });

  it("moves the big number once the next 30 minutes falls in the next hour", () => {
    // 8:40 -> +30 is 9:10 (hour 9), +60 is 9:40 (hour 9)
    expect(outlookFor(typical, 25, "08:40:00")).toMatchObject({ in30: 55, in60: 55, d30: 30, trend: "up" });
  });

  it("falls when the usual day drops", () => {
    expect(outlookFor(typical, 60, "09:40:00")).toMatchObject({ in30: 40, in60: 40, d30: -20, trend: "down" });
  });

  it("lets the 30 minute change decide, and only looks further while it is steady", () => {
    // Hourly data: from :30 on, +30 and +60 land in the same hour, so they cannot disagree.
    const second = outlookFor(day({ 9: 20, 10: 50, 11: 5 }), 25, "09:40:00");
    expect(second).toMatchObject({ d30: 30, d60: 30, trend: "up" });
    // From :00 to :29, +30 is this hour (steady) and +60 is the next one.
    const first = outlookFor(day({ 9: 20, 10: 5 }), 25, "09:10:00");
    expect(first).toMatchObject({ d30: 0, d60: -15, trend: "down" });
  });

  it("is steady when both changes are small", () => {
    expect(outlookFor(day({ 8: 20, 9: 22, 10: 23 }), 25, "08:40:00")).toMatchObject({ trend: "steady" });
  });

  it("never goes below zero", () => {
    expect(outlookFor(day({ 8: 40, 9: 0 }), 10, "08:40:00")).toMatchObject({ in30: 0, d30: -10, trend: "down" });
  });

  it("has no 60 minute estimate when that hour is blank, and still uses the 30 minute one", () => {
    expect(outlookFor(day({ 8: 20, 9: 50 }), 25, "08:40:00")).toMatchObject({ in30: 55, in60: 55 });
    expect(outlookFor(day({ 8: 20, 9: 50 }), 25, "09:40:00")).toBeNull();
    expect(outlookFor(day({ 8: 20, 9: 50, 10: null as never }), 25, "08:40:00")?.in60).toBe(55);
  });

  it("gives nothing without a live wait, a typical day, or an hour to start from", () => {
    expect(outlookFor(typical, null, "08:40:00")).toBeNull();
    expect(outlookFor(undefined, 25, "08:40:00")).toBeNull();
    expect(outlookFor(day({ 9: 50 }), 25, "08:40:00")).toBeNull();
    expect(outlookFor(typical, 25, "")).toBeNull();
  });

  it("wraps past midnight", () => {
    expect(outlookFor(day({ 23: 40, 0: 10 }), 30, "23:40:00")).toMatchObject({ in30: 0, d30: -30, trend: "down" });
  });
});
