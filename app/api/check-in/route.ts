import { getBorderWaitTimes } from "@/lib/border-wait-times";
import { isVisitorId, VISITOR_COOKIE } from "@/lib/analytics";
import {
  chatClosed,
  checkPresence,
  CHECK_IN_POSTS_PER_HOUR,
  HIDDEN_TO_MUTE,
  MUTE_WINDOW_HOURS,
  cleanMessage,
  isJpeg,
  MAX_CHECK_IN_PHOTO_BYTES,
} from "@/lib/check-in";
import { countRecentUsage, recordUsage } from "@/lib/usage.server";
import { deleteCheckIn, listCheckIns, reactorKey, saveCheckIn } from "@/lib/check-in.server";
import { geoPointFrom } from "@/lib/port-locations";
import { hasProfanity } from "@/lib/profanity";
import {
  badRequest,
  NO_STORE,
  serverError,
  sessionUserId,
  unauthorized,
} from "@/lib/session.server";
import { tooManyRequests, withinLimit } from "@/lib/throttle.server";
import { cookies } from "next/headers";

/** The form is a few fields and one shrunken photo. Anything bigger is not a post. */
const MAX_BODY_BYTES = MAX_CHECK_IN_PHOTO_BYTES + 100_000;

/**
 * The thread at `?port=`, oldest first. Open to anyone, guests included. `mine` and `reacted`
 * describe the viewer: the account, or for a guest only the reactions kept under their visitor cookie.
 */
export async function GET(request: Request) {
  const port = new URL(request.url).searchParams.get("port");
  if (!port || port.length > 20) return badRequest("Expected a port.");
  // Closed overnight. No session read, no query, so the database can sleep.
  if (chatClosed()) return Response.json({ checkIns: [], closed: true }, { headers: NO_STORE });

  try {
    const userId = await sessionUserId();
    const visitor = (await cookies()).get(VISITOR_COOKIE)?.value ?? null;
    const actor = userId
      ? reactorKey.user(userId)
      : isVisitorId(visitor)
        ? reactorKey.visitor(visitor)
        : null;
    return Response.json(
      { checkIns: await listCheckIns(port, userId, actor) },
      { headers: NO_STORE },
    );
  } catch (error) {
    return serverError("Could not load check-ins.", error);
  }
}

/**
 * Posts to a crossing's chat. The browser sends where it thinks it is, and the server decides: it
 * finds the crossing in the cached CBP feed and runs the same `checkPresence` the browser ran. The
 * coordinates are not saved. A client can still lie about its position, so this keeps an honest
 * rider honest and a casual fake out; it is not proof. Needs an account.
 */
export async function POST(request: Request) {
  if (chatClosed()) return Response.json({ error: "closed" }, { status: 403, headers: NO_STORE });
  const userId = await sessionUserId();
  if (!userId) return unauthorized();

  const length = Number(request.headers.get("content-length"));
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) {
    return Response.json({ error: "Too large." }, { status: 413, headers: NO_STORE });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return badRequest("Expected a message.");
  }

  const portNumber = form.get("port");
  const point = geoPointFrom(Number(form.get("lat")), Number(form.get("lng")));
  const accuracy = Number(form.get("accuracy"));
  if (typeof portNumber !== "string" || !point) return badRequest("Expected a port and a position.");

  const file = form.get("photo");
  let photo: Uint8Array | null = null;
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_CHECK_IN_PHOTO_BYTES) {
      return Response.json({ error: "photo" }, { status: 413, headers: NO_STORE });
    }
    photo = new Uint8Array(await file.arrayBuffer());
    if (!isJpeg(photo)) return Response.json({ error: "photo" }, { status: 400, headers: NO_STORE });
  }

  const message = cleanMessage(form.get("message"));
  if (!message && !photo) return Response.json({ error: "empty" }, { status: 400, headers: NO_STORE });
  // The browser checks first for instant feedback. This is the check that counts.
  if (message && hasProfanity(message)) {
    return Response.json({ error: "language" }, { status: 422, headers: NO_STORE });
  }

  if (!(await withinLimit("check-in", CHECK_IN_POSTS_PER_HOUR, 3600, userId))) return tooManyRequests();

  try {
    // Posting pauses for an account whose messages keep being hidden by reports.
    if ((await countRecentUsage(userId, "flagged", MUTE_WINDOW_HOURS)) >= HIDDEN_TO_MUTE) {
      return Response.json({ error: "muted" }, { status: 403, headers: NO_STORE });
    }
  } catch (error) {
    // Moderation lookup failing must not turn into a free pass or a block. Let the post through.
    console.error("mute check", error);
  }

  try {
    const snapshot = await getBorderWaitTimes();
    const port = snapshot.ports.find((item) => item.portNumber === portNumber);
    if (!port) return badRequest("Unknown crossing.");

    const presence = checkPresence(port, point, accuracy);
    if (!presence.ok) {
      return Response.json({ error: presence.reason }, { status: 403, headers: NO_STORE });
    }

    const id = await saveCheckIn({ userId, portNumber, message, photo, milesAway: presence.miles });
    // The count outlives the post, which is deleted after 6 hours.
    await recordUsage(userId, "chat");
    return Response.json({ id }, { status: 201, headers: NO_STORE });
  } catch (error) {
    return serverError("Could not save the post.", error);
  }
}

/** Takes back one of the account's own posts. */
export async function DELETE(request: Request) {
  const userId = await sessionUserId();
  if (!userId) return unauthorized();

  const id = new URL(request.url).searchParams.get("id");
  if (!id || id.length > 64) return badRequest("Expected an id.");

  try {
    const removed = await deleteCheckIn(userId, id);
    return Response.json({ removed }, { headers: NO_STORE });
  } catch (error) {
    return serverError("Could not remove the post.", error);
  }
}
