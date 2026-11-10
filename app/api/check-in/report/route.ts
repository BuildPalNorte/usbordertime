import { chatClosed, isReportReason } from "@/lib/check-in";
import { reactorKey, reportCheckIn } from "@/lib/check-in.server";
import { visitorForActivity } from "@/lib/guest-activity.server";
import { badRequest, NO_STORE, serverError, sessionUserId } from "@/lib/session.server";
import { tooManyRequests, withinLimit } from "@/lib/throttle.server";
import { recordUsage } from "@/lib/usage.server";

/**
 * Reports a post. Open to guests, like reactions: a guest is the browser's visitor id. The reporter
 * stops seeing the post at once. Enough different riders hide it for everyone, and the author is
 * then counted (`flagged`), which is what pauses an account that keeps getting reported.
 * Body: `{ id, reason }`.
 */
export async function POST(request: Request) {
  if (chatClosed()) return Response.json({ error: "closed" }, { status: 403, headers: NO_STORE });
  let body: { id?: unknown; reason?: unknown } | null;
  try {
    body = await request.json();
  } catch {
    return badRequest("Expected a report.");
  }
  const id = body?.id;
  if (typeof id !== "string" || id.length > 64 || !isReportReason(body?.reason)) {
    return badRequest("Expected a report.");
  }

  try {
    const userId = await sessionUserId();
    let actor: string;
    if (userId) {
      actor = reactorKey.user(userId);
    } else {
      const visitor = await visitorForActivity();
      if (!visitor) return tooManyRequests();
      actor = reactorKey.visitor(visitor);
    }
    if (!(await withinLimit("check-in-report", 30, 3600, actor))) return tooManyRequests();

    const result = await reportCheckIn(id, actor, userId, body.reason);
    if (result.status === "missing") {
      return Response.json({ ok: false }, { status: 404, headers: NO_STORE });
    }
    if (result.status === "own") return badRequest("That is your own message.");
    if (result.status === "hidden") await recordUsage(result.authorId, "flagged");
    return Response.json({ ok: true }, { headers: NO_STORE });
  } catch (error) {
    return serverError("Could not save the report.", error);
  }
}
