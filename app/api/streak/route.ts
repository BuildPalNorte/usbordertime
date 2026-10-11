import {
  badRequest,
  NO_STORE,
  serverError,
  sessionUserId,
  unauthorized,
} from "@/lib/session.server";
import { isTimeZone } from "@/lib/schedule";
import { getStreak, recordVisit } from "@/lib/streak.server";

/** The streak as of today in `?timeZone=`. Does not count a visit. */
export async function GET(request: Request) {
  const userId = await sessionUserId();
  if (!userId) return unauthorized();

  const timeZone = new URL(request.url).searchParams.get("timeZone");
  if (!isTimeZone(timeZone)) return badRequest("Expected a time zone.");

  try {
    return Response.json(await getStreak(userId, timeZone), { headers: NO_STORE });
  } catch {
    return serverError("Could not load the streak.");
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
    return Response.json(await recordVisit(userId, timeZone), { headers: NO_STORE });
  } catch {
    return serverError("Could not save the visit.");
  }
}
