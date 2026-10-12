import { parseDeviceKey, parsePushDevice } from "@/lib/alert";
import { deletePushDevice, savePushDevice } from "@/lib/alert.server";
import {
  badRequest,
  NO_STORE,
  serverError,
  sessionUserId,
  unauthorized,
} from "@/lib/session.server";

/** Remembers this device for the signed-in account, so alerts can reach it. */
export async function PUT(request: Request) {
  const userId = await sessionUserId();
  if (!userId) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Expected a push subscription.");
  }
  const device = parsePushDevice(body);
  if (!device) return badRequest("Expected a push subscription.");
  const deviceKey = parseDeviceKey((body as { deviceKey?: unknown }).deviceKey);

  try {
    await savePushDevice(userId, device, deviceKey);
    return Response.json({ ok: true }, { headers: NO_STORE });
  } catch (error) {
    return serverError("Could not save this device.", error);
  }
}

/** Forgets this device. Sign-out calls it so the next account on this phone is not alerted. */
export async function DELETE(request: Request) {
  const userId = await sessionUserId();
  if (!userId) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Expected an endpoint.");
  }
  const endpoint = (body as { endpoint?: unknown } | null)?.endpoint;
  if (typeof endpoint !== "string" || endpoint.length > 1000) return badRequest("Expected an endpoint.");

  try {
    await deletePushDevice(userId, endpoint);
    return Response.json({ ok: true }, { headers: NO_STORE });
  } catch (error) {
    return serverError("Could not remove this device.", error);
  }
}
