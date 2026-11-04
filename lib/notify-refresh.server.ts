import { revalidateTag } from "next/cache";

/** The cached picture of who is expecting a notification. See `loadNotifyExpectation`. */
export const NOTIFY_EXPECTATION_TAG = "notify-expectation";

/**
 * Drops that picture so the next cron reads it again. Called after an alert, a schedule, or a
 * device changes. `{ expire: 0 }` means the next read waits for the new rows instead of acting
 * on the old ones.
 */
export function refreshNotifyExpectation(): void {
  revalidateTag(NOTIFY_EXPECTATION_TAG, { expire: 0 });
}
