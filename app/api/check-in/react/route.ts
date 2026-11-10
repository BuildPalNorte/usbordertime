import { chatClosed, isReaction } from "@/lib/check-in";
import { reactorKey, setReaction } from "@/lib/check-in.server";
import { visitorForActivity } from "@/lib/guest-activity.server";
import { badRequest, NO_STORE, serverError, sessionUserId } from "@/lib/session.server";
import { tooManyRequests, withinLimit } from "@/lib/throttle.server";

/**
 * A like or other reaction on a post. Open to guests: a guest is the browser's visitor id, which
 * `visitorForActivity` makes and limits, so reacting needs no account and cannot flood the table.
 * One of each kind per rider. Body: `{ id, kind, on }`.
 */
export async function PUT(request: Request) {
  if (chatClosed()) return Response.json({ error: "closed" }, { status: 403, headers: NO_STORE });
  let body: { id?: unknown; kind?: unknown; on?: unknown } | null;
  try {
    body = await request.json();
  } catch {
    return badRequest("Expected a reaction.");
  }
  const id = body?.id;
  if (typeof id !== "string" || id.length > 64 || !isReaction(body?.kind) || typeof body?.on !== "boolean") {
    return badRequest("Expected a reaction.");
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
    if (!(await withinLimit("check-in-react", 200, 3600, actor))) return tooManyRequests();

    const ok = await setReaction(id, actor, body.kind, body.on);
    return Response.json({ ok }, { status: ok ? 200 : 404, headers: NO_STORE });
  } catch (error) {
    return serverError("Could not save the reaction.", error);
  }
}
