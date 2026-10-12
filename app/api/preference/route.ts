import { parsePreference } from "@/lib/preference";
import { getPreference, savePreference } from "@/lib/preference.server";
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
    const preference = await getPreference(userId);
    return Response.json(preference, { headers: NO_STORE });
  } catch (error) {
    return serverError("Could not load preferences.", error);
  }
}

export async function PUT(request: Request) {
  const userId = await sessionUserId();
  if (!userId) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Expected preferences.");
  }

  const preference = parsePreference(body);
  if (!preference) {
    return badRequest("Expected preferences.");
  }

  try {
    const savedAt = await savePreference(userId, preference);
    await recordUsage(userId, "sync");
    return Response.json({ ...preference, savedAt }, { headers: NO_STORE });
  } catch (error) {
    return serverError("Could not save preferences.", error);
  }
}
