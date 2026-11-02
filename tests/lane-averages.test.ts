import { describe, expect, it } from "vitest";
import { COPY } from "@/lib/i18n";
import { averageForHour, usualForHour } from "@/lib/lane-averages";

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
