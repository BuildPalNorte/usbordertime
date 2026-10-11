import { isPortNumber } from "@/lib/alert";
import { forgetPushDevice, listPushDevices } from "@/lib/alert.server";
import { COPY } from "@/lib/i18n";
import { isMode, type Mode } from "@/lib/ports";
import { getPreference } from "@/lib/preference.server";
import { sendPush } from "@/lib/push.server";
import { crossingSharePath } from "@/lib/routes";
import { badRequest, NO_STORE, serverError, sessionUserId, unauthorized } from "@/lib/session.server";

/**
 * Sends one test notification to the browser that asked for it. It does not change any alert.
 * The body may name a crossing so the tap opens that card.
 */
export async function POST(request: Request) {
  const userId = await sessionUserId();
  if (!userId) return unauthorized();

  let portNumber: string | null = null;
  let mode: Mode | null = null;
  let endpoint = "";
  try {
    const body: unknown = await request.json();
    const record = body as { portNumber?: unknown; mode?: unknown; endpoint?: unknown } | null;
    if (isPortNumber(record?.portNumber) && isMode(record?.mode)) {
      portNumber = record.portNumber;
      mode = record.mode;
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

    const result = await sendPush(device, {
      title: copy.alertTestTitle,
      body: copy.alertTestBody,
      url: portNumber && mode ? crossingSharePath(portNumber, mode, locale) : "/",
      tag: "test",
    });
    if (result === "gone") await forgetPushDevice(device.endpoint);
    if (result !== "sent") return serverError("The test did not go out.");
    return Response.json({ ok: true }, { headers: NO_STORE });
  } catch {
    return serverError("The test did not go out.");
  }
}
