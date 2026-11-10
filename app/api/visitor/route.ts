import { visitorForActivity } from "@/lib/guest-activity.server";
import { NO_STORE, serverError } from "@/lib/session.server";
import { tooManyRequests } from "@/lib/throttle.server";

/**
 * A page with no session painted in this browser. Sets the cookie that names it, and counts it once
 * more. A known browser is limited by its own id and a new one by address (`visitorForActivity`), so
 * an attack cannot flood `visitor` and a shared address does not count strangers together.
 */
export async function POST() {
  try {
    const id = await visitorForActivity();
    if (!id) return tooManyRequests();
    return new Response(null, { status: 204, headers: NO_STORE });
  } catch (error) {
    return serverError("Could not note the visit.", error);
  }
}
