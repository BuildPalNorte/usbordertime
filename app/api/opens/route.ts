import { isExcludedFromAnalytics } from "@/lib/analytics";
import { NO_STORE, serverError, sessionUser, unauthorized } from "@/lib/session.server";
import { recordAppOpen } from "@/lib/usage.server";

/** One open of the app by the signed-in account. A burst inside 15 seconds counts once. */
export async function POST() {
  const user = await sessionUser();
  if (!user) return unauthorized();
  if (isExcludedFromAnalytics(user.email)) return new Response(null, { status: 204, headers: NO_STORE });

  try {
    await recordAppOpen(user.id);
    return new Response(null, { status: 204, headers: NO_STORE });
  } catch (error) {
    return serverError("Could not save the open.", error);
  }
}
