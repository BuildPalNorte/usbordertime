import { MAX_SCHEDULES, parseSchedule } from "@/lib/schedule";
import { deleteSchedule, listSchedules, saveSchedule } from "@/lib/schedule.server";
import {
  badRequest,
  NO_STORE,
  serverError,
  sessionUserId,
  unauthorized,
} from "@/lib/session.server";
import { recordUsage } from "@/lib/usage.server";

export async function GET() {
  const userId = await sessionUserId();
  if (!userId) return unauthorized();

  try {
    return Response.json(await listSchedules(userId), { headers: NO_STORE });
  } catch (error) {
    return serverError("Could not load schedules.", error);
  }
}

export async function PUT(request: Request) {
  const userId = await sessionUserId();
  if (!userId) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Expected a schedule.");
  }
  const input = parseSchedule(body);
  if (!input) return badRequest("Expected a schedule.");

  try {
    const result = await saveSchedule(userId, input);
    if (result.status === "limit") {
      return Response.json(
        { error: `You can keep up to ${MAX_SCHEDULES} schedules.` },
        { status: 409, headers: NO_STORE },
      );
    }
    if (result.status === "missing") {
      return Response.json({ error: "Schedule not found." }, { status: 404, headers: NO_STORE });
    }
    await recordUsage(userId, "alarm");
    return Response.json(result.schedule, { headers: NO_STORE });
  } catch (error) {
    return serverError("Could not save the schedule.", error);
  }
}

export async function DELETE(request: Request) {
  const userId = await sessionUserId();
  if (!userId) return unauthorized();

  const id = new URL(request.url).searchParams.get("id");
  if (!id || !/^[A-Za-z0-9-]{8,40}$/.test(id)) return badRequest("Expected a schedule.");

  try {
    await deleteSchedule(userId, id);
    return Response.json({ ok: true }, { headers: NO_STORE });
  } catch (error) {
    return serverError("Could not remove the schedule.", error);
  }
}
