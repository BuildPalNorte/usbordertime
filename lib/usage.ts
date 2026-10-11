/** Client-safe. No server imports here. */

/**
 * What a signed-in account does in the app, one row per action. The admin dashboard totals these
 * per account.
 */
export const USAGE_KINDS = ["visit", "ask", "alert", "alarm", "sync"] as const;
export type UsageKind = (typeof USAGE_KINDS)[number];

export const USAGE_LABEL: Record<UsageKind, string> = {
  visit: "Days",
  ask: "Questions",
  alert: "Alerts",
  alarm: "Alarms",
  sync: "Saves",
};
