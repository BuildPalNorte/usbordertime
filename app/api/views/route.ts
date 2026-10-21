import { isPortNumber } from "@/lib/alert";
import { isExcludedFromAnalytics } from "@/lib/analytics";
import { recordPortView } from "@/lib/port-view.server";
import { badRequest, NO_STORE, serverError, sessionUser, unauthorized } from "@/lib/session.server";

/** One open of a crossing's details by the signed-in account. */
export async function POST(request: Request) {
  const user = await sessionUser();
  if (!user) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Expected a crossing.");
  }
  const portNumber = (body as { portNumber?: unknown } | null)?.portNumber;
  if (!isPortNumber(portNumber)) return badRequest("Expected a crossing.");

  // The people who run the app are not counted.
  if (isExcludedFromAnalytics(user.email)) return new Response(null, { status: 204, headers: NO_STORE });

  try {
    await recordPortView(user.id, portNumber);
    return new Response(null, { status: 204, headers: NO_STORE });
  } catch (error) {
    return serverError("Could not save the view.", error);
  }
}
