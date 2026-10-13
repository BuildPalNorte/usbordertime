import { replayLocationPrompt, saveLocationChoice } from "@/lib/profile";
import { NO_STORE, serverError, sessionUserId, unauthorized } from "@/lib/session.server";

/** Clears a new account's location question, whichever way they answered it. */
export async function POST() {
  const userId = await sessionUserId();
  if (!userId) return unauthorized();

  try {
    await saveLocationChoice(userId);
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
