/** Client-safe. No server imports here. */

/**
 * What a signed-in account does in the app, one row per action. The admin dashboard totals these
 * per account.
 */
export const USAGE_KINDS = ["visit", "ask", "alert", "alarm", "sync", "open", "chat", "flagged"] as const;
export type UsageKind = (typeof USAGE_KINDS)[number];

export const USAGE_LABEL: Record<UsageKind, string> = {
  visit: "Days",
  ask: "Questions",
  alert: "Alerts",
  alarm: "Alarms",
  sync: "Saves",
  open: "Opens",
  chat: "Chat messages sent",
  flagged: "Chat messages hidden by reports",
};
