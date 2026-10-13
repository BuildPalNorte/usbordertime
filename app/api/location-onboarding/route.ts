import { isGeoPoint, type GeoPoint } from "@/lib/port-locations";
import { replayLocationPrompt, saveLocationChoice } from "@/lib/profile";
import { badRequest, NO_STORE, serverError, sessionUserId, unauthorized } from "@/lib/session.server";

/**
 * Clears a new account's location question, whichever way they answered it.
 * A body is the latitude and longitude they shared. No body means they picked by hand.
 */
export async function POST(request: Request) {
  const userId = await sessionUserId();
  if (!userId) return unauthorized();

  let point: GeoPoint | null = null;
  const text = await request.text();
  if (text.trim()) {
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return badRequest("Expected a location.");
    }
    if (!isGeoPoint(body)) return badRequest("Expected a location.");
    point = body;
  }

  try {
    await saveLocationChoice(userId, point);
    return Response.json({ ok: true }, { headers: NO_STORE });
  } catch (error) {
    return serverError("Could not save that answer.", error);
  }
}

/** Development only. Puts the question back so the prompt can be replayed. */
export async function DELETE() {
  if (process.env.NODE_ENV !== "development") {
    return new Response(null, { status: 404 });
  }

  const userId = await sessionUserId();
  if (!userId) return unauthorized();

  try {
    await replayLocationPrompt(userId);
    return Response.json({ ok: true }, { headers: NO_STORE });
  } catch (error) {
    return serverError("Could not reset that.", error);
  }
}
