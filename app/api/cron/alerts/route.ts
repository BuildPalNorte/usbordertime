import { runAlertCheck } from "@/lib/alert-check.server";
import { loadNotifyExpectation } from "@/lib/notify-expectation.server";
import { getBorderWaitTimes } from "@/lib/border-wait-times";
import { alertsNeedWork, failOpenPlan, notifyPlan } from "@/lib/notify-window";
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
 * What this tick has to do. A threshold check runs only when a rule would change state against the
 * live waits. If the cached picture fails, do everything rather than miss an alarm.
 */
async function expectedWork() {
  let expectation;
  try {
    expectation = await loadNotifyExpectation();
  } catch (error) {
    console.error("notify expectation", error);
    return failOpenPlan();
  }

  const plan = notifyPlan(expectation);
  if (plan.alerts) {
    try {
      const snapshot = await getBorderWaitTimes();
      plan.alerts = alertsNeedWork(expectation.alerts, snapshot.ports);
    } catch (error) {
      // CBP is unreachable. Let the check run so it reports that, as it did before.
      console.error("alert pre-check", error);
    }
  }
  return plan;
}

const IDLE_ALERTS = { checked: 0, notified: 0 };
const IDLE_SCHEDULES = { checked: 0, sent: 0 };

/**
 * Every 15 minutes. The tick still arrives on that schedule, and it leaves the database closed
 * unless something changes: a threshold alert whose lane crosses its threshold during the day
 * (4:00am–10:00pm Central; nothing from 10:00pm to 4:00am), or a schedule inside its send window.
 * One failing does not stop the other. A skipped tick is what lets Neon suspend.
 */
export async function GET(request: Request) {
  if (!authorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
  }
  const plan = await expectedWork();
  const [alerts, schedules] = await Promise.allSettled([
    plan.alerts ? runAlertCheck() : Promise.resolve(IDLE_ALERTS),
    plan.schedules ? runScheduleCheck() : Promise.resolve(IDLE_SCHEDULES),
  ]);
  if (alerts.status === "rejected") console.error("alert check", alerts.reason);
  if (schedules.status === "rejected") console.error("schedule check", schedules.reason);
  if (alerts.status === "rejected" && schedules.status === "rejected") {
    return Response.json({ error: "Alert check failed." }, { status: 502, headers: NO_STORE });
  }
  return Response.json(
    {
      ...(alerts.status === "fulfilled" ? alerts.value : { error: "Alert check failed." }),
      schedules: schedules.status === "fulfilled" ? schedules.value : { error: "Schedule check failed." },
      ran: plan,
    },
    { headers: NO_STORE },
  );
}
