import { isExcludedFromAnalytics } from "@/lib/analytics";
import { recordGuestOpen, visitorForActivity } from "@/lib/guest-activity.server";
import { NO_STORE, serverError, sessionUser } from "@/lib/session.server";
import { recordAppOpen } from "@/lib/usage.server";

/**
 * One open of the app. A signed-in account is counted on that account. A visit with no session is
 * counted on the visitor cookie, which this creates when the browser does not have one yet.
 */
export async function POST() {
  const user = await sessionUser();
  try {
    if (user) {
      if (!isExcludedFromAnalytics(user.email)) await recordAppOpen(user.id);
    } else {
      await recordGuestOpen(await visitorForActivity());
    }
    return new Response(null, { status: 204, headers: NO_STORE });
  } catch (error) {
    return serverError("Could not save the open.", error);
  }
}
