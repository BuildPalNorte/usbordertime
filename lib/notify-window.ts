import { REARM_SLACK } from "@/lib/alert";
import { type Mode, readLane } from "@/lib/ports";
import { isDue, localMoment } from "@/lib/schedule";
import type { PortWaitTime } from "@/lib/border-wait-times";

/** Client-safe. No server imports here. */

/**
 * Threshold alerts stay quiet on this clock. A schedule uses its own time zone, so an alarm
 * set for 10:30pm still sends during these hours.
 */
export const THRESHOLD_ZONE = "America/Chicago";

/** 10:00pm Central. The quiet hours start at this minute and run until 4:00am. */
export const THRESHOLD_QUIET_START = 22 * 60;

/** 4:00am Central. A check at this minute is the first one of the day. */
export const THRESHOLD_QUIET_END = 4 * 60;

/** A running schedule, reduced to the clock the cron can test without opening the database. */
export type ScheduleSlot = {
  minute: number;
  days: number[];
  timeZone: string;
};

/**
 * A threshold alert that can reach a device, with the server's memory of whether it already fired.
 * `below` is the same flag `wait_alert` holds. It is what lets the cron compare a rule with the
 * live waits in memory.
 */
export type AlertRule = {
  portNumber: string;
  mode: Mode;
  threshold: number;
  below: boolean;
};

/** Who can be notified, as of the last time that picture was read. */
export type NotifyExpectation = {
  alerts: readonly AlertRule[];
  schedules: readonly ScheduleSlot[];
};

/** True from 10:00pm until 4:00am in America/Chicago, including across the daylight-saving change. */
export function thresholdQuiet(at: Date = new Date()): boolean {
  const minute = localMoment(THRESHOLD_ZONE, at).minute;
  return minute >= THRESHOLD_QUIET_START || minute < THRESHOLD_QUIET_END;
}

/**
 * Whether any rule would change state against these waits. It mirrors `runAlertCheck`: a lane
 * under its threshold fires when `below` is false, and a lane that climbs `REARM_SLACK` past it,
 * or closes, re-arms when `below` is true. Nothing else writes, so a tick with no such rule
 * leaves the database closed.
 */
export function alertsNeedWork(
  rules: readonly AlertRule[],
  ports: readonly PortWaitTime[],
): boolean {
  const byNumber = new Map(ports.map((port) => [port.portNumber, port]));
  return rules.some((rule) => {
    const port = byNumber.get(rule.portNumber);
    if (!port) return false;
    const reading = readLane(port, rule.mode);
    if (reading.minutes === null) return rule.below && reading.tone === "closed";
    if (reading.minutes < rule.threshold) return !rule.below;
    return rule.below && reading.minutes >= rule.threshold + REARM_SLACK;
  });
}

/**
 * What to run when the cached picture cannot be read. A skipped alarm is worse than an extra
 * wake, so schedules run, and thresholds keep the same quiet hours.
 */
export function failOpenPlan(at: Date = new Date()): { alerts: boolean; schedules: boolean } {
  return { alerts: !thresholdQuiet(at), schedules: true };
}

/**
 * Whether this tick could need the database. `alerts` only says a rule exists in the daytime;
 * `alertsNeedWork` then decides against the live waits. A schedule check runs only inside that
 * schedule's send window, which is when the person is expecting it.
 */
export function notifyPlan(
  expectation: NotifyExpectation,
  at: Date = new Date(),
): { alerts: boolean; schedules: boolean } {
  return {
    alerts: expectation.alerts.length > 0 && !thresholdQuiet(at),
    schedules: expectation.schedules.some((slot) => isDue(slot, null, at)),
  };
}
