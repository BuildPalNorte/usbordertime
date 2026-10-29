import { REARM_SLACK, type PushDevice } from "@/lib/alert";
import {
  claimBelow,
  forgetPushDevice,
  listArmedAlerts,
  listPushDevices,
  setBelow,
  type ArmedAlert,
} from "@/lib/alert.server";
import { getBorderWaitTimes } from "@/lib/border-wait-times";
import { COPY, modeName } from "@/lib/i18n";
import { portName, readLane } from "@/lib/ports";
import { sendPush } from "@/lib/push.server";
import { crossingSharePath } from "@/lib/routes";
import type { PortWaitTime } from "@/lib/border-wait-times";

const BATCH = 10;

export type AlertCheck = { checked: number; notified: number };

/**
 * Compares every alert with the cached CBP snapshot and sends one notification each time a lane
 * crosses from at-or-above its threshold to under it. Called every 15 minutes by the cron route.
 *
 * `below` is the memory. It flips true when the notification goes out and back to false only after
 * the wait climbs `REARM_SLACK` past the threshold, or the lane closes.
 */
export async function runAlertCheck(): Promise<AlertCheck> {
  const snapshot = await getBorderWaitTimes();
  const byNumber = new Map(snapshot.ports.map((port) => [port.portNumber, port]));
  const alerts = await listArmedAlerts();

  // A phone is looked up once per account per run, however many of its alerts fire.
  const devicesByUser = new Map<string, ReturnType<typeof listPushDevices>>();
  const devicesFor = (userId: string) => {
    let pending = devicesByUser.get(userId);
    if (!pending) {
      pending = listPushDevices(userId);
      devicesByUser.set(userId, pending);
    }
    return pending;
  };

  const check = async (alert: ArmedAlert): Promise<boolean> => {
    const port = byNumber.get(alert.portNumber);
    if (!port) return false;

    const reading = readLane(port, alert.mode);
    const minutes = reading.minutes;

    if (minutes === null) {
      // A closed lane is not "short". Re-arm it so the reopening can notify.
      // An update that is merely pending says nothing, so leave the state alone.
      if (alert.below && reading.tone === "closed") await setBelow(alert, false);
      return false;
    }

    if (minutes < alert.threshold) {
      if (alert.below) return false;
      // Of two overlapping runs, only one wins the claim.
      if (!(await claimBelow(alert))) return false;
      const delivered = await notify(alert, port, minutes, await devicesFor(alert.userId));
      // Nobody could be reached. Try again on the next run instead of losing the drop.
      if (!delivered) await setBelow(alert, false);
      return delivered;
    }

    if (alert.below && minutes >= alert.threshold + REARM_SLACK) {
      await setBelow(alert, false);
    }
    return false;
  };

  let notified = 0;
  // Alerts are independent, so check them in small batches. One failing does not stop the rest.
  for (let i = 0; i < alerts.length; i += BATCH) {
    const results = await Promise.allSettled(alerts.slice(i, i + BATCH).map(check));
    for (const result of results) {
      if (result.status === "fulfilled") {
        if (result.value) notified += 1;
      } else {
        console.error("alert check", result.reason);
      }
    }
  }

  return { checked: alerts.length, notified };
}

async function notify(
  alert: ArmedAlert,
  port: PortWaitTime,
  minutes: number,
  devices: PushDevice[],
): Promise<boolean> {
  const copy = COPY[alert.locale];
  const lane = modeName(alert.mode, port, copy);
  const payload = {
    title: portName(port).title,
    body: copy.alertPushBody(lane, minutes, alert.threshold),
    url: crossingSharePath(alert.portNumber, alert.mode, alert.locale),
    tag: `${alert.portNumber}:${alert.mode}`,
  };

  const results = await Promise.all(
    devices.map(async (device) => {
      const result = await sendPush(device, payload);
      if (result === "gone") await forgetPushDevice(device.endpoint);
      return result;
    }),
  );
  return results.includes("sent");
}
