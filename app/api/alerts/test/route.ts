import { isPortNumber } from "@/lib/alert";
import { forgetPushDevice, listPushDevices } from "@/lib/alert.server";
import { getBorderWaitTimes } from "@/lib/border-wait-times";
import { COPY, waitLabel } from "@/lib/i18n";
import { isMode, portName, readLane, type Mode } from "@/lib/ports";
import { getPreference } from "@/lib/preference.server";
import { sendPush } from "@/lib/push.server";
import { crossingSharePath, routesFocusPath } from "@/lib/routes";
import { MAX_SCHEDULE_PORTS } from "@/lib/schedule";
import { badRequest, NO_STORE, serverError, sessionUserId, unauthorized } from "@/lib/session.server";

/**
 * Sends one test notification to the browser that asked for it. It does not change any alert.
 * `ports` opens those bridges side by side. A single `portNumber` opens that card.
 */
export async function POST(request: Request) {
  const userId = await sessionUserId();
  if (!userId) return unauthorized();

  let ports: string[] = [];
  let portNumber: string | null = null;
  let mode: Mode | null = null;
  let endpoint = "";
  try {
    const body: unknown = await request.json();
    const record = body as {
      ports?: unknown;
      portNumber?: unknown;
      mode?: unknown;
      endpoint?: unknown;
    } | null;
    if (isMode(record?.mode)) mode = record.mode;
    if (Array.isArray(record?.ports)) {
      ports = record.ports.filter(isPortNumber).slice(0, MAX_SCHEDULE_PORTS);
    } else if (isPortNumber(record?.portNumber)) {
      portNumber = record.portNumber;
    }
    if (typeof record?.endpoint === "string") endpoint = record.endpoint;
  } catch {
    return badRequest("Expected this device.");
  }
  if (!endpoint) return badRequest("Expected this device.");

  try {
    const preference = await getPreference(userId).catch(() => null);
    const locale = preference?.locale ?? "en";
    const copy = COPY[locale];
    const device = (await listPushDevices(userId)).find((item) => item.endpoint === endpoint);
    if (!device) {
      return Response.json({ error: "No device." }, { status: 409, headers: NO_STORE });
    }

    const url =
      ports.length > 0 && mode
        ? routesFocusPath(ports, mode)
        : portNumber && mode
          ? crossingSharePath(portNumber, mode, locale)
          : "/";

    const result = await sendPush(device, {
      title: copy.alertTestTitle,
      body: ports.length > 0 && mode ? await routesBody(ports, mode, copy) : copy.alertTestBody,
      url,
      // A new tag every time, so the banner shows again instead of replacing a quiet one.
      tag: `test:${crypto.randomUUID()}`,
    });
    if (result === "gone") await forgetPushDevice(device.endpoint);
    if (result !== "sent") return serverError("The test did not go out.");
    return Response.json({ ok: true }, { headers: NO_STORE });
  } catch {
    return serverError("The test did not go out.");
  }
}

/** One line per bridge, matching a schedule. The short line stands in when the feed is down. */
async function routesBody(
  ports: string[],
  mode: Mode,
  copy: (typeof COPY)["en"],
): Promise<string> {
  try {
    const snapshot = await getBorderWaitTimes();
    const byNumber = new Map(snapshot.ports.map((port) => [port.portNumber, port]));
    const lines = ports.flatMap((number) => {
      const port = byNumber.get(number);
      if (!port) return [];
      const name = portName(port).title;
      const reading = readLane(port, mode);
      return [
        reading.minutes !== null
          ? copy.scheduleWait(name, reading.minutes)
          : copy.scheduleStatus(name, waitLabel(reading, copy)),
      ];
    });
    return lines.length > 0 ? lines.join("\n") : copy.scheduleTestBody;
  } catch {
    return copy.scheduleTestBody;
  }
}
