import { isPortNumber } from "@/lib/alert";
import { isExcludedFromAnalytics } from "@/lib/analytics";
import { recordGuestView, visitorForActivity } from "@/lib/guest-activity.server";
import { recordPortView } from "@/lib/port-view.server";
import { badRequest, NO_STORE, serverError, sessionUser } from "@/lib/session.server";

/** One open of a crossing's details. An account is named; a guest is the visitor cookie. */
export async function POST(request: Request) {
  const user = await sessionUser();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Expected a crossing.");
  }
  const portNumber = (body as { portNumber?: unknown } | null)?.portNumber;
  if (!isPortNumber(portNumber)) return badRequest("Expected a crossing.");

  // The people who run the app are not counted.
  if (user && isExcludedFromAnalytics(user.email)) return new Response(null, { status: 204, headers: NO_STORE });

  try {
    if (user) await recordPortView(user.id, portNumber);
    else await recordGuestView(await visitorForActivity(), portNumber);
    return new Response(null, { status: 204, headers: NO_STORE });
  } catch (error) {
    return serverError("Could not save the view.", error);
  }
}
