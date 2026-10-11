import { REARM_SLACK } from "@/lib/alert";
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

export type AlertCheck = { checked: number; notified: number };

/**
 * Compares every alert with the cached CBP snapshot and sends one notification each time a lane
 * crosses from at-or-above its threshold to under it. Called once a minute by the cron route.
 *
 * `below` is the memory. It flips true when the notification goes out and back to false only after
 * the wait climbs `REARM_SLACK` past the threshold, or the lane closes.
 */
export async function runAlertCheck(): Promise<AlertCheck> {
  const snapshot = await getBorderWaitTimes();
  const byNumber = new Map(snapshot.ports.map((port) => [port.portNumber, port]));
  const alerts = await listArmedAlerts();

  let notified = 0;
  for (const alert of alerts) {
    const port = byNumber.get(alert.portNumber);
    if (!port) continue;

    const reading = readLane(port, alert.mode);
    const minutes = reading.minutes;

    if (minutes === null) {
      // A closed lane is not "short". Re-arm it so the reopening can notify.
      // An update that is merely pending says nothing, so leave the state alone.
      if (alert.below && reading.tone === "closed") await setBelow(alert, false);
      continue;
    }

    if (minutes < alert.threshold) {
      if (alert.below) continue;
      // Of two overlapping runs, only one wins the claim.
      if (!(await claimBelow(alert))) continue;
      const delivered = await notify(alert, port, minutes);
      if (delivered) notified += 1;
      // Nobody could be reached. Try again next minute instead of losing the drop.
      else await setBelow(alert, false);
      continue;
    }

    if (alert.below && minutes >= alert.threshold + REARM_SLACK) {
      await setBelow(alert, false);
    }
  }

  return { checked: alerts.length, notified };
}

async function notify(alert: ArmedAlert, port: PortWaitTime, minutes: number): Promise<boolean> {
  const copy = COPY[alert.locale];
  const lane = modeName(alert.mode, port, copy);
  const payload = {
    title: portName(port).title,
    body: copy.alertPushBody(lane, minutes, alert.threshold),
    url: crossingSharePath(alert.portNumber, alert.mode, alert.locale),
    tag: `${alert.portNumber}:${alert.mode}`,
  };

  const devices = await listPushDevices(alert.userId);
  const results = await Promise.all(
    devices.map(async (device) => {
      const result = await sendPush(device, payload);
      if (result === "gone") await forgetPushDevice(device.endpoint);
      return result;
    }),
  );
  return results.includes("sent");
}
