import { isPortNumber } from "@/lib/alert";
import { forgetPushDevice, listPushDevices } from "@/lib/alert.server";
import { COPY } from "@/lib/i18n";
import { isMode, type Mode } from "@/lib/ports";
import { getPreference } from "@/lib/preference.server";
import { sendPush } from "@/lib/push.server";
import { crossingSharePath } from "@/lib/routes";
import { NO_STORE, serverError, sessionUserId, unauthorized } from "@/lib/session.server";

/**
 * Sends one test notification to every device on this account. It does not change any alert.
 * The body may name a crossing so the tap opens that card; a missing body still sends.
 */
export async function POST(request: Request) {
  const userId = await sessionUserId();
  if (!userId) return unauthorized();

  let portNumber: string | null = null;
  let mode: Mode | null = null;
  try {
    const body: unknown = await request.json();
    const record = body as { portNumber?: unknown; mode?: unknown } | null;
    if (isPortNumber(record?.portNumber) && isMode(record?.mode)) {
      portNumber = record.portNumber;
      mode = record.mode;
    }
  } catch {
    // A test with no crossing still sends.
  }

  try {
    const preference = await getPreference(userId).catch(() => null);
    const locale = preference?.locale ?? "en";
    const copy = COPY[locale];
    const devices = await listPushDevices(userId);
    if (devices.length === 0) {
      return Response.json({ error: "No device." }, { status: 409, headers: NO_STORE });
    }

    const results = await Promise.all(
      devices.map(async (device) => {
        const result = await sendPush(device, {
          title: copy.alertTestTitle,
          body: copy.alertTestBody,
          url: portNumber && mode ? crossingSharePath(portNumber, mode, locale) : "/",
          // A fresh tag every time. Reusing one replaces the old alert in place, and macOS
          // then files it in Notification Center without showing a banner.
          tag: `test:${Date.now()}`,
        });
        if (result === "gone") await forgetPushDevice(device.endpoint);
        return result;
      }),
    );
    if (!results.includes("sent")) return serverError("The test did not go out.");
    return Response.json({ ok: true }, { headers: NO_STORE });
  } catch {
    return serverError("The test did not go out.");
  }
}
