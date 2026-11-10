import { purgeExpiredCheckIns } from "@/lib/check-in.server";
import { chatClosed } from "@/lib/check-in";
import { authorizedCron } from "@/lib/cron-auth.server";

const NO_STORE = { "Cache-Control": "private, no-store" };

/**
 * Runs at 3am and 4am UTC (10pm Central in summer and winter), noon and 6pm UTC (`vercel.json`).
 * While the chat is closed it deletes every post; otherwise it deletes posts older than the 6 hours
 * the chat shows, with their photos, reactions and reports. What stays is the per-account count in `usage_event`
 * (`chat` sent, `flagged` hidden by reports), which is the record of who posted how much.
 */
export async function GET(request: Request) {
  if (!authorizedCron(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
  }
  try {
    // At the 10pm close the whole chat goes. Other runs only trim what is past 6 hours.
    const deleted = await purgeExpiredCheckIns(chatClosed());
    return Response.json({ deleted }, { headers: NO_STORE });
  } catch (error) {
    console.error("check-in purge", error);
    return Response.json({ error: "Could not purge." }, { status: 500, headers: NO_STORE });
  }
}
