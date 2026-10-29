import { runAlertCheck } from "@/lib/alert-check.server";
import { runScheduleCheck } from "@/lib/schedule-check.server";
import { timingSafeEqual } from "node:crypto";

const NO_STORE = { "Cache-Control": "private, no-store" };

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  // No secret configured means nobody can call this. It must never fall open.
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Every 15 minutes: compare every wait alert with the cached CBP snapshot and send what is due,
 * and send the scheduled summaries whose time has come. One failing does not stop the other.
 * The gap is longer than Neon's 5-minute scale-to-zero, so the database can suspend between runs.
 */
export async function GET(request: Request) {
  if (!authorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
  }
  const [alerts, schedules] = await Promise.allSettled([runAlertCheck(), runScheduleCheck()]);
  if (alerts.status === "rejected") console.error("alert check", alerts.reason);
  if (schedules.status === "rejected") console.error("schedule check", schedules.reason);
  if (alerts.status === "rejected" && schedules.status === "rejected") {
    return Response.json({ error: "Alert check failed." }, { status: 502, headers: NO_STORE });
  }
  return Response.json(
    {
      ...(alerts.status === "fulfilled" ? alerts.value : { error: "Alert check failed." }),
      schedules: schedules.status === "fulfilled" ? schedules.value : { error: "Schedule check failed." },
    },
    { headers: NO_STORE },
  );
}
