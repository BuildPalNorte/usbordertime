import { isPortNumber, MAX_ALERTS, parseAlert } from "@/lib/alert";
import { deleteAlert, listAlerts, saveAlert } from "@/lib/alert.server";
import { getBorderWaitTimes } from "@/lib/border-wait-times";
import { isMode, readLane } from "@/lib/ports";
import {
  badRequest,
  NO_STORE,
  serverError,
  sessionUserId,
  unauthorized,
} from "@/lib/session.server";

export async function GET() {
  const userId = await sessionUserId();
  if (!userId) return unauthorized();

  try {
    return Response.json(await listAlerts(userId), { headers: NO_STORE });
  } catch {
    return serverError("Could not load alerts.");
  }
}

export async function PUT(request: Request) {
  const userId = await sessionUserId();
  if (!userId) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Expected an alert.");
  }
  const alert = parseAlert(body);
  if (!alert) return badRequest("Expected an alert.");

  // Where the lane stands now. An alert set on an already-short lane waits for the next drop.
  let below = false;
  try {
    const snapshot = await getBorderWaitTimes();
    const port = snapshot.ports.find((item) => item.portNumber === alert.portNumber);
    if (!port) return badRequest("Unknown crossing.");
    const reading = readLane(port, alert.mode);
    if (!reading.available) return badRequest("This crossing does not publish that lane.");
    below = reading.minutes !== null && reading.minutes < alert.threshold;
  } catch {
    // CBP is down. Save anyway; the first good check decides.
  }

  try {
    const saved = await saveAlert(userId, alert, below);
    if (!saved) {
      return Response.json(
        { error: `You can keep up to ${MAX_ALERTS} alerts.` },
        { status: 409, headers: NO_STORE },
      );
    }
    return Response.json(alert, { headers: NO_STORE });
  } catch {
    return serverError("Could not save the alert.");
  }
}

export async function DELETE(request: Request) {
  const userId = await sessionUserId();
  if (!userId) return unauthorized();

  const params = new URL(request.url).searchParams;
  const port = params.get("port");
  const mode = params.get("mode");
  if (!isPortNumber(port) || !isMode(mode)) return badRequest("Expected a crossing and lane.");

  try {
    await deleteAlert(userId, port, mode);
    return Response.json({ ok: true }, { headers: NO_STORE });
  } catch {
    return serverError("Could not remove the alert.");
  }
}
