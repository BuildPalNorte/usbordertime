/** Client-safe. No server imports here. */

/**
 * Accounts that never count toward analytics: the people who run the app, testing it. This is the
 * only place these addresses live. Comparison ignores case and surrounding spaces.
 */
export const ANALYTICS_EXCLUDED_EMAILS: readonly string[] = ["orlandovaluta568@gmail.com"];

export function isExcludedFromAnalytics(email: string | null | undefined): boolean {
  if (!email) return false;
  const needle = email.trim().toLowerCase();
  return ANALYTICS_EXCLUDED_EMAILS.some((entry) => entry === needle);
}

/** The cookie that names a browser that opened the sign-in screen. */
export const VISITOR_COOKIE = "usbordertime.visitor";

/** A visitor id is a random UUID. Anything else in the cookie is ignored. */
export function isVisitorId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

/** Opens of one crossing by one account that make it worth a nudge, with no alert set. */
export const OFTEN_OPENS = 3;
