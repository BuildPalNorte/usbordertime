import { describe, expect, it } from "vitest";
import { daysToMask, isDue, localMoment, maskToDays, SEND_WINDOW } from "@/lib/schedule";

describe("localMoment", () => {
  it("reads the wall clock of the zone, not UTC", () => {
    // 2026-03-02 03:30 UTC is still Sunday evening in Mexico City (UTC-6, no DST in March 2026).
    const at = new Date("2026-03-02T03:30:00Z");
    expect(localMoment("America/Mexico_City", at)).toEqual({
      date: "2026-03-01",
      weekday: 0,
      minute: 21 * 60 + 30,
    });
  });

  it("follows daylight saving: 7:00 local is 7:00 on both sides of the change", () => {
    // US spring forward 2026-03-08. Chicago is UTC-6 before, UTC-5 after.
    expect(localMoment("America/Chicago", new Date("2026-03-07T13:00:00Z")).minute).toBe(7 * 60);
    expect(localMoment("America/Chicago", new Date("2026-03-09T12:00:00Z")).minute).toBe(7 * 60);
  });
});

describe("isDue", () => {
  const schedule = { minute: 7 * 60, days: [1], timeZone: "America/Chicago" };
  const monday = (time: string) => new Date(`2026-03-02T${time}:00Z`); // Chicago is UTC-6 here

  it("is due inside the send window", () => {
    const start = monday("13:00");
    expect(isDue(schedule, null, start)).toBe(true);
    expect(isDue(schedule, null, new Date(start.getTime() + (SEND_WINDOW - 1) * 60_000))).toBe(true);
  });

  it("is not due before the time or after the window", () => {
    const start = monday("13:00");
    expect(isDue(schedule, null, monday("12:59"))).toBe(false);
    expect(isDue(schedule, null, new Date(start.getTime() + SEND_WINDOW * 60_000))).toBe(false);
  });

  it("is not due twice in one local day", () => {
    expect(isDue(schedule, "2026-03-02", monday("13:01"))).toBe(false);
  });

  it("is not due on a day it does not run", () => {
    expect(isDue(schedule, null, new Date("2026-03-03T13:00:00Z"))).toBe(false);
  });
});

describe("day masks", () => {
  it("round-trips", () => {
    expect(maskToDays(daysToMask([0, 3, 6]))).toEqual([0, 3, 6]);
  });
});
