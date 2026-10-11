import { saveReferral } from "@/lib/profile";
import { isReferral } from "@/lib/referral";
import { badRequest, NO_STORE, serverError, sessionUserId, unauthorized } from "@/lib/session.server";

/** Stores how this new account found Border Time. */
export async function POST(request: Request) {
  const userId = await sessionUserId();
  if (!userId) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Expected a source.");
  }

  const source = (body as { source?: unknown } | null)?.source;
  if (!isReferral(source)) return badRequest("Expected a source.");

  try {
    const saved = await saveReferral(userId, source);
    if (!saved) return badRequest("Expected a source.");
    return Response.json({ source }, { headers: NO_STORE });
  } catch {
    return serverError("Could not save that answer.");
  }
}
