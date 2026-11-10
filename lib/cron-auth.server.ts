import { timingSafeEqual } from "node:crypto";

/** Whether a cron request carries `Authorization: Bearer $CRON_SECRET`. A missing secret rejects everything. */
export function authorizedCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  // No secret configured means nobody can call this. It must never fall open.
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
