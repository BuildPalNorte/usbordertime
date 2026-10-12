import { forgetPushDevice, listPushDevices } from "@/lib/alert.server";
import { getBorderWaitTimes } from "@/lib/border-wait-times";
import { COPY, modeName, waitLabel } from "@/lib/i18n";
import { portName, readLane } from "@/lib/ports";
import { sendPush } from "@/lib/push.server";
import { routesFocusPath } from "@/lib/routes";
import { clockLabel, isDue, localMoment } from "@/lib/schedule";
import {
  claimSend,
  listRunningSchedules,
  releaseSend,
  type DueCandidate,
} from "@/lib/schedule.server";
import type { PortWaitTime } from "@/lib/border-wait-times";

const BATCH = 10;

export type ScheduleCheck = { checked: number; sent: number };

/**
 * Sends the scheduled summaries that are due. Called once a minute by the cron route, after the
 * wait alerts. A schedule is due for a few minutes after its time, and only once per local day.
 */
export async function runScheduleCheck(): Promise<ScheduleCheck> {
  const schedules = await listRunningSchedules();
  const now = new Date();
  const due = schedules.filter((schedule) => isDue(schedule, schedule.lastSentOn, now));
  if (due.length === 0) return { checked: schedules.length, sent: 0 };

  const snapshot = await getBorderWaitTimes();
  const byNumber = new Map(snapshot.ports.map((port) => [port.portNumber, port]));

  const send = async (schedule: DueCandidate): Promise<boolean> => {
    const today = localMoment(schedule.timeZone, now).date;
    // Of two overlapping runs, only one wins the claim.
    if (!(await claimSend(schedule.id, today))) return false;

    const ports = schedule.ports.flatMap((number) => byNumber.get(number) ?? []);
    // Nothing to report: the bridges left the feed. Today stays claimed, so it does not retry.
    if (ports.length === 0) return false;

    const delivered = await deliver(schedule, ports, today);
    // Nobody could be reached. Try again next minute instead of losing the morning.
    if (!delivered) await releaseSend(schedule.id);
    return delivered;
  };

  let sent = 0;
  // Schedules are independent, so send them in small batches. One failing does not stop the rest.
  for (let i = 0; i < due.length; i += BATCH) {
    const results = await Promise.allSettled(due.slice(i, i + BATCH).map(send));
    for (const result of results) {
      if (result.status === "fulfilled") {
        if (result.value) sent += 1;
      } else {
        console.error("schedule send", result.reason);
      }
    }
  }

  return { checked: schedules.length, sent };
}

async function deliver(
  schedule: DueCandidate,
  ports: PortWaitTime[],
  today: string,
): Promise<boolean> {
  const copy = COPY[schedule.locale];
  const lines = ports.map((port) => {
    const name = portName(port).title;
    const reading = readLane(port, schedule.mode);
    return reading.minutes !== null
      ? copy.scheduleWait(name, reading.minutes)
      : copy.scheduleStatus(name, waitLabel(reading, copy));
  });

  const when = copy.scheduleTitle(
    clockLabel(schedule.minute, schedule.locale),
    modeName(schedule.mode, ports[0], copy),
  );
  const payload = {
    // A name replaces the title. The time and lane move to the first line of the body.
    title: schedule.name ?? when,
    body: (schedule.name ? [when, ...lines] : lines).join("\n"),
    // A tap shows these bridges as full cards, one above the other, until dismissed.
    url: routesFocusPath(
      ports.map((port) => port.portNumber),
      schedule.mode,
    ),
    // A retry replaces the same notification. Tomorrow's is a new one.
    tag: `schedule:${schedule.id}:${today}`,
  };

  const devices = await listPushDevices(schedule.userId);
  const results = await Promise.all(
    devices.map(async (device) => {
      const result = await sendPush(device, payload);
      if (result === "gone") await forgetPushDevice(device.endpoint);
      return result;
    }),
  );
  return results.includes("sent");
}
