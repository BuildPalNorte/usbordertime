import { VISITOR_COOKIE } from "@/lib/analytics";
import { CAMPAIGN_COOKIE, campaignQuery } from "@/lib/campaign";
import { knownCampaign } from "@/lib/campaign.server";
import { NO_STORE, serverError } from "@/lib/session.server";
import { recordVisitor } from "@/lib/visitor.server";
import { cookies } from "next/headers";

const YEAR = 60 * 60 * 24 * 365;

/** The sign-in screen painted in this browser. Sets the cookie that names it, and counts it once more. */
export async function POST() {
  try {
    const jar = await cookies();
    // A campaign lookup must not drop the visit. An unknown code counts as none.
    let campaign: string | null = null;
    try {
      campaign = await knownCampaign(campaignQuery(jar.get(CAMPAIGN_COOKIE)?.value ?? null));
    } catch (error) {
      console.error("campaign", error);
    }
    const id = await recordVisitor(jar.get(VISITOR_COOKIE)?.value ?? null, campaign);
    jar.set(VISITOR_COOKIE, id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: YEAR,
    });
    return new Response(null, { status: 204, headers: NO_STORE });
  } catch (error) {
    return serverError("Could not note the visit.", error);
  }
}
