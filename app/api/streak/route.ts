import {
  badRequest,
  NO_STORE,
  serverError,
  sessionUserId,
  unauthorized,
} from "@/lib/session.server";
import { isTimeZone } from "@/lib/schedule";
import { getStreak, recordVisit } from "@/lib/streak.server";
import { recordUsage } from "@/lib/usage.server";

/** The streak as of today in `?timeZone=`. Does not count a visit. */
export async function GET(request: Request) {
  const userId = await sessionUserId();
  if (!userId) return unauthorized();

  const timeZone = new URL(request.url).searchParams.get("timeZone");
  if (!isTimeZone(timeZone)) return badRequest("Expected a time zone.");

  try {
    return Response.json(await getStreak(userId, timeZone), { headers: NO_STORE });
  } catch (error) {
    return serverError("Could not load the streak.", error);
  }
}

/** Counts today's visit. Safe to call more than once a day. */
export async function POST(request: Request) {
  const userId = await sessionUserId();
  if (!userId) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Expected a time zone.");
  }
  const timeZone = (body as { timeZone?: unknown } | null)?.timeZone;
  if (!isTimeZone(timeZone)) return badRequest("Expected a time zone.");

  try {
    const streak = await recordVisit(userId, timeZone);
    // Only the first call of a day counts as a visit. Repeat opens the same day change nothing.
    if (streak.advanced) await recordUsage(userId, "visit");
    return Response.json(streak, { headers: NO_STORE });
  } catch (error) {
    return serverError("Could not save the visit.", error);
  }
}
