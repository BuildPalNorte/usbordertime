import { isIOS, isStandalone } from "@/lib/install-store";

const DEVICE_KEY = "usbordertime.push-device.v1";

/** One id per browser, so a new push address replaces the old one instead of adding another. */
function deviceKey(): string {
  try {
    const stored = window.localStorage.getItem(DEVICE_KEY);
    if (stored && /^[0-9a-f-]{36}$/i.test(stored)) return stored;
    const next = crypto.randomUUID();
    window.localStorage.setItem(DEVICE_KEY, next);
    return next;
  } catch {
    return crypto.randomUUID();
  }
}

/** Browser side of wait alerts. Client-only. */

export type PushSupport =
  /** This browser has no Web Push at all. */
  | "unsupported"
  /** iPhone only delivers push to an app that was added to the Home Screen. */
  | "needs-install"
  | "denied"
  /** Supported, and the person has not been asked yet. */
  | "ask"
  | "granted";

export function pushSupport(): PushSupport {
  if (typeof window === "undefined") return "unsupported";
  const capable =
    "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  // Safari on iPhone hides PushManager until the site runs from the Home Screen.
  if (!capable) return isIOS() && !isStandalone() ? "needs-install" : "unsupported";
  if (Notification.permission === "denied") return "denied";
  return Notification.permission === "granted" ? "granted" : "ask";
}

function keyBytes(base64Url: string): Uint8Array<ArrayBuffer> {
  const padded = base64Url + "=".repeat((4 - (base64Url.length % 4)) % 4);
  const raw = atob(padded.replaceAll("-", "+").replaceAll("_", "/"));
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

async function registration(): Promise<ServiceWorkerRegistration> {
  const registered = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  return registered;
}

async function upload(subscription: PushSubscription): Promise<boolean> {
  const response = await fetch("/api/push-subscription", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...subscription.toJSON(), deviceKey: deviceKey() }),
  });
  return response.ok;
}

/** The push address of this browser, after it has subscribed. */
export async function pushEndpoint(): Promise<string | null> {
  if (!("serviceWorker" in navigator)) return null;
  const registered = await navigator.serviceWorker.getRegistration("/sw.js");
  const subscription = await registered?.pushManager.getSubscription();
  return subscription?.endpoint ?? null;
}

export type EnableResult = "ok" | "denied" | "unsupported" | "needs-install" | "failed";

/**
 * Asks permission when needed, subscribes this device, and tells the server about it.
 * Call it from a tap: browsers refuse the permission prompt otherwise.
 */
export async function enablePush(): Promise<EnableResult> {
  const support = pushSupport();
  if (support === "unsupported" || support === "needs-install" || support === "denied") {
    return support === "denied" ? "denied" : support;
  }

  if (support === "ask") {
    // First await in the tap, so the prompt still counts as user-initiated.
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return "denied";
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) return "failed";

  try {
    const registered = await registration();
    const subscription =
      (await registered.pushManager.getSubscription()) ??
      (await registered.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes(publicKey),
      }));
    return (await upload(subscription)) ? "ok" : "failed";
  } catch {
    return "failed";
  }
}

/**
 * For an account that already has alerts. The push address can rotate, and sign-out drops it, so
 * the app re-registers this device on open. Permission was already given, so nothing is asked.
 */
export async function resyncPush(): Promise<void> {
  if (pushSupport() !== "granted") return;
  await enablePush();
}

/** Sign-out: this device stops receiving the account's alerts, and stops being its address. */
export async function disablePush(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const registered = await navigator.serviceWorker.getRegistration("/sw.js");
    const subscription = await registered?.pushManager.getSubscription();
    if (!subscription) return;
    await fetch("/api/push-subscription", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    }).catch(() => undefined);
    await subscription.unsubscribe();
  } catch {
    // Signing out must not wait on this.
  }
}
