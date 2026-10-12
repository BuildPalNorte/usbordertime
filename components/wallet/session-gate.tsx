"use client";

import { authClient } from "@/lib/auth/client";
import { clearInviteCookie, dropInviteParam } from "@/lib/invite";
import { useLayoutEffect, useSyncExternalStore, type ReactNode } from "react";
import { SignInScreen } from "./sign-in-screen";

const emptySubscribe = () => () => {};

/** The server already read the cookie on this request. Drop it before the next paint. */
function InviteClaim() {
  useLayoutEffect(() => {
    dropInviteParam();
    clearInviteCookie();
  }, []);
  return null;
}

/** Hides the bridges as soon as the session is gone, including after sign-out. */
export function SessionGate({ children }: { children: ReactNode }) {
  const { data, isPending } = authClient.useSession();
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  if (mounted && !isPending && !data?.user) return <SignInScreen />;
  return (
    <>
      <InviteClaim />
      {children}
    </>
  );
}
