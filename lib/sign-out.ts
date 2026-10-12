import { authClient } from "@/lib/auth/client";
import { disablePush } from "@/lib/push-client";

/**
 * Ends the session. Push is removed first, while the session still exists, so the server accepts
 * it and this phone stops getting the account's alerts. Then a full load shows the sign-in screen.
 */
export async function signOutAndReload(): Promise<void> {
  await disablePush();
  await authClient.signOut();
  window.location.assign(new URL("/", window.location.origin));
}
