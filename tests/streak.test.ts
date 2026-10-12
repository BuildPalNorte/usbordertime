import { describe, expect, it } from "vitest";
import { daysBetween, EMPTY_STREAK, recordDay, streakLevel, viewStreak } from "@/lib/streak";

describe("daysBetween", () => {
  it("counts whole days across a month and a leap day", () => {
    expect(daysBetween("2026-01-31", "2026-02-01")).toBe(1);
    expect(daysBetween("2028-02-28", "2028-03-01")).toBe(2);
  });
});

describe("recordDay", () => {
  it("starts a run on the first visit", () => {
    const { record, advanced } = recordDay(EMPTY_STREAK, "2026-03-01");
    expect(advanced).toBe(true);
    expect(record).toMatchObject({ current: 1, longest: 1, totalDays: 1, lastDay: "2026-03-01" });
  });

  it("ignores a second visit on the same day", () => {
    const first = recordDay(EMPTY_STREAK, "2026-03-01").record;
    const again = recordDay(first, "2026-03-01");
    expect(again.advanced).toBe(false);
    expect(again.record).toBe(first);
  });

  it("extends the run on the next day and restarts after a gap", () => {
    let record = recordDay(EMPTY_STREAK, "2026-03-01").record;
    record = recordDay(record, "2026-03-02").record;
    record = recordDay(record, "2026-03-03").record;
    expect(record).toMatchObject({ current: 3, longest: 3, totalDays: 3 });
    record = recordDay(record, "2026-03-06").record;
    expect(record).toMatchObject({ current: 1, longest: 3, totalDays: 4 });
  });

  it("treats a clock that moved backward as the same visit", () => {
    const record = recordDay(EMPTY_STREAK, "2026-03-05").record;
    expect(recordDay(record, "2026-03-04").advanced).toBe(false);
  });
});

describe("viewStreak", () => {
  const record = { current: 4, longest: 4, totalDays: 4, lastDay: "2026-03-04" };
  it("keeps the run through the day after the last visit", () => {
    expect(viewStreak(record, "2026-03-05")).toMatchObject({ current: 4, today: false });
  });
  it("shows 0 once a full day was skipped", () => {
    expect(viewStreak(record, "2026-03-06").current).toBe(0);
  });
});

describe("streakLevel", () => {
  it("maps run length to a level", () => {
    expect([1, 2, 3, 7, 14, 30, 100, 400].map(streakLevel)).toEqual([0, 0, 1, 2, 3, 4, 5, 5]);
  });
});
