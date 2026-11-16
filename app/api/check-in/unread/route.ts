import { isVisitorId, VISITOR_COOKIE } from "@/lib/analytics";
import { chatClosed } from "@/lib/check-in";
import { reactorKey, unreadCheckIns } from "@/lib/check-in.server";
import { badRequest, NO_STORE, serverError, sessionUserId } from "@/lib/session.server";
import { cookies } from "next/headers";

/** A rider's saved bridges. More than this is not a wallet. */
const MAX_PORTS = 12;

/**
 * What is new in the chats at `?watch=port:sinceMs,port:sinceMs`, for the unread badges. Open to
 * guests (they can read the chat); a reply count needs an account and is zero without one. Closed
 * overnight, it answers without touching the database.
 */
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("watch") ?? "";
  const watch = raw
    .split(",")
    .slice(0, MAX_PORTS)
    .map((part) => {
      const [port, since] = part.split(":");
      return { port, since: Number(since) };
    })
    .filter((w) => w.port && w.port.length <= 20 && Number.isFinite(w.since) && w.since > 0);
  if (raw && watch.length === 0) return badRequest("Expected bridges to watch.");
  if (chatClosed()) return Response.json({ unread: {} }, { headers: NO_STORE });

  try {
    const userId = await sessionUserId();
    const visitor = (await cookies()).get(VISITOR_COOKIE)?.value ?? null;
    const actor = userId
      ? reactorKey.user(userId)
      : isVisitorId(visitor)
        ? reactorKey.visitor(visitor)
        : null;
    return Response.json({ unread: await unreadCheckIns(watch, userId, actor) }, { headers: NO_STORE });
  } catch (error) {
    return serverError("Could not load unread counts.", error);
  }
}
