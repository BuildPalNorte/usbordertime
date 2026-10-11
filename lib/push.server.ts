import type { PushDevice } from "@/lib/alert";
import webpush from "web-push";

export type PushPayload = {
  title: string;
  body: string;
  url: string;
  /** A newer alert for the same lane replaces the one still on the screen. */
  tag: string;
};

let configured = false;

function configure(): void {
  if (configured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) throw new Error("Missing VAPID keys");
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export type PushResult = "sent" | "gone" | "failed";

/**
 * One notification to one device. `gone` means the push service no longer knows this address
 * (the app was removed or permission was revoked), so the caller deletes it.
 */
export async function sendPush(device: PushDevice, payload: PushPayload): Promise<PushResult> {
  configure();
  try {
    await webpush.sendNotification(device, JSON.stringify(payload), {
      // A wait is only worth reading for a few minutes. After that the push service drops it.
      TTL: 600,
      urgency: "high",
      timeout: 10_000,
    });
    return "sent";
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode;
    return status === 404 || status === 410 ? "gone" : "failed";
  }
}
