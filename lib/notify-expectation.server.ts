import { ensureTables } from "@/lib/alert.server";
import { database } from "@/lib/db.server";
import { NOTIFY_EXPECTATION_TAG } from "@/lib/notify-refresh.server";
import type { AlertRule, NotifyExpectation, ScheduleSlot } from "@/lib/notify-window";
import { isMode } from "@/lib/ports";
import { isTimeZone, maskToDays } from "@/lib/schedule";
import { ensureScheduleTable } from "@/lib/schedule.server";
import { unstable_cache } from "next/cache";

/**
 * How long the picture may sit before the cron reads it again on its own. Saving or deleting an
 * alert, a schedule, or a device refreshes it sooner. A day with nothing to send should not open
 * the database every 15 minutes.
 */
const EXPECTATION_MAX_AGE = 12 * 60 * 60;

type SlotRow = { minute: number; days: number; time_zone: string };
type RuleRow = { port_number: string; mode: string; threshold: number; below: boolean };

function ruleFrom(row: RuleRow): AlertRule | null {
  return isMode(row.mode)
    ? { portNumber: row.port_number, mode: row.mode, threshold: row.threshold, below: row.below }
    : null;
}

function slotFrom(row: SlotRow): ScheduleSlot | null {
  if (!isTimeZone(row.time_zone) || !Number.isInteger(row.minute)) return null;
  const days = maskToDays(row.days);
  if (days.length === 0) return null;
  return { minute: row.minute, days, timeZone: row.time_zone };
}

/**
 * The rows the cron needs in order to decide it has nothing to do: each alert that can reach a
 * device, with its `below` flag, and each running schedule's clock.
 */
async function readNotifyExpectation(): Promise<NotifyExpectation> {
  await ensureTables();
  await ensureScheduleTable();
  const sql = database();
  const armed = (await sql`
    select a.port_number, a.mode, a.threshold, a.below
    from wait_alert a
    where exists (select 1 from push_subscription s where s.user_id = a.user_id)
  `) as RuleRow[];
  const rows = (await sql`
    select s.minute, s.days, s.time_zone
    from schedule s
    where s.enabled
      and exists (select 1 from push_subscription d where d.user_id = s.user_id)
  `) as SlotRow[];
  return {
    alerts: armed.flatMap((row) => {
      const rule = ruleFrom(row);
      return rule ? [rule] : [];
    }),
    schedules: rows.flatMap((row) => {
      const slot = slotFrom(row);
      return slot ? [slot] : [];
    }),
  };
}

/**
 * Cached across cron ticks. `unstable_cache` keeps the result between requests, so a tick that
 * only needs to look at the clock does not wake Neon. `use cache` would not: that store is
 * per instance and does not survive the next cold start.
 */
export const loadNotifyExpectation = unstable_cache(
  readNotifyExpectation,
  ["notify-expectation"],
  { tags: [NOTIFY_EXPECTATION_TAG], revalidate: EXPECTATION_MAX_AGE },
);
