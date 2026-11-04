import { describe, expect, it } from "vitest";
import type { LaneReading, PortWaitTime } from "@/lib/border-wait-times";
import { REARM_SLACK } from "@/lib/alert";
import {
  alertsNeedWork,
  failOpenPlan,
  notifyPlan,
  thresholdQuiet,
  type AlertRule,
} from "@/lib/notify-window";

const rule: AlertRule = { portNumber: "535501", mode: "car", threshold: 20, below: false };
const alertsOn = { alerts: [rule], schedules: [] as const };
const nobody = { alerts: [] as const, schedules: [] as const };

function lane(delayMinutes: number | null, operationalStatus = "no delay"): LaneReading {
  return { operationalStatus, delayMinutes, lanesOpen: 2, updateTime: null };
}

function port(standard: LaneReading, portStatus = "Open"): PortWaitTime {
  return {
    portNumber: "535501",
    border: "Mexican Border",
    portName: "Brownsville",
    crossingName: null,
    hours: "24 hrs",
    date: "11/4/2026",
    time: "1:00 AM",
    portStatus,
    constructionNotice: null,
    commercial: { maximumLanes: 2, standard, fast: standard },
    passenger: { maximumLanes: 4, standard, nexusSentri: standard, ready: standard },
    pedestrian: { maximumLanes: 2, standard, ready: standard },
  };
}

describe("alertsNeedWork", () => {
  it("is idle while a lane stays at or above its threshold", () => {
    expect(alertsNeedWork([rule], [port(lane(20))])).toBe(false);
    expect(alertsNeedWork([rule], [port(lane(45))])).toBe(false);
  });

  it("wakes when a lane drops under its threshold and has not fired", () => {
    expect(alertsNeedWork([rule], [port(lane(19))])).toBe(true);
  });

  it("stays idle while a fired alert's lane is still under its threshold", () => {
    expect(alertsNeedWork([{ ...rule, below: true }], [port(lane(10))])).toBe(false);
  });

  it("re-arms only once the wait climbs REARM_SLACK past the threshold", () => {
    const fired = { ...rule, below: true };
    expect(alertsNeedWork([fired], [port(lane(rule.threshold + REARM_SLACK - 1))])).toBe(false);
    expect(alertsNeedWork([fired], [port(lane(rule.threshold + REARM_SLACK))])).toBe(true);
  });

  it("re-arms a fired alert when the lane closes, and ignores a lane that is only pending", () => {
    const fired = { ...rule, below: true };
    expect(alertsNeedWork([fired], [port(lane(null, "lanes closed"))])).toBe(true);
    expect(alertsNeedWork([fired], [port(lane(null, "update pending"))])).toBe(false);
    expect(alertsNeedWork([rule], [port(lane(null, "lanes closed"))])).toBe(false);
  });

  it("ignores a crossing missing from the feed", () => {
    expect(alertsNeedWork([{ ...rule, portNumber: "999999" }], [port(lane(5))])).toBe(false);
  });
});

describe("threshold quiet hours", () => {
  it("starts at 10:00pm Central and ends at 4:00am, standard time", () => {
    // 2026-11-04 is the Wednesday after the US fall-back, so Chicago is UTC-6.
    expect(thresholdQuiet(new Date("2026-11-04T03:59:00Z"))).toBe(false); // 9:59pm
    expect(thresholdQuiet(new Date("2026-11-04T04:00:00Z"))).toBe(true); // 10:00pm
    expect(thresholdQuiet(new Date("2026-11-04T09:59:00Z"))).toBe(true); // 3:59am
    expect(thresholdQuiet(new Date("2026-11-04T10:00:00Z"))).toBe(false); // 4:00am
  });

  it("follows daylight saving", () => {
    // July is CDT, UTC-5. 10:00pm local is 03:00 UTC. 4:00am local is 09:00 UTC.
    expect(thresholdQuiet(new Date("2026-07-05T02:59:00Z"))).toBe(false);
    expect(thresholdQuiet(new Date("2026-07-05T03:00:00Z"))).toBe(true);
    expect(thresholdQuiet(new Date("2026-07-05T08:59:00Z"))).toBe(true);
    expect(thresholdQuiet(new Date("2026-07-05T09:00:00Z"))).toBe(false);
  });
});

describe("notifyPlan", () => {
  const sevenAm = { minute: 7 * 60, days: [1], timeZone: "America/Chicago" };
  // Monday 2026-03-02, Chicago is still CST. 13:00 UTC is 7:00am.
  const mondayMorning = new Date("2026-03-02T13:00:00Z");
  const mondayNight = new Date("2026-03-03T04:30:00Z"); // 10:30pm Central

  it("checks thresholds during the day and skips them overnight", () => {
    expect(notifyPlan(alertsOn, mondayMorning)).toEqual({ alerts: true, schedules: false });
    expect(notifyPlan(alertsOn, mondayNight)).toEqual({ alerts: false, schedules: false });
  });

  it("opens the database for a schedule only inside its send window", () => {
    const expectation = { alerts: [] as const, schedules: [sevenAm] };
    expect(notifyPlan(expectation, mondayMorning).schedules).toBe(true);
    expect(notifyPlan(expectation, new Date("2026-03-02T12:59:00Z")).schedules).toBe(false);
    expect(notifyPlan(expectation, new Date("2026-03-03T13:00:00Z")).schedules).toBe(false);
  });

  it("still sends an alarm that was set during the quiet hours", () => {
    const late = { minute: 22 * 60 + 30, days: [1], timeZone: "America/Chicago" };
    expect(notifyPlan({ alerts: [rule], schedules: [late] }, mondayNight)).toEqual({
      alerts: false,
      schedules: true,
    });
  });

  it("fails open: schedules always run, thresholds keep their quiet hours", () => {
    expect(failOpenPlan(mondayMorning)).toEqual({ alerts: true, schedules: true });
    expect(failOpenPlan(mondayNight)).toEqual({ alerts: false, schedules: true });
  });

  it("leaves the database closed when nobody is expecting anything", () => {
    expect(notifyPlan(nobody, mondayMorning)).toEqual({ alerts: false, schedules: false });
  });
});
