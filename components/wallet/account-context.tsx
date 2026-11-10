"use client";

import { createContext, useContext, type ReactNode } from "react";

const AccountContext = createContext(true);

/**
 * The server passes whether this visit has a session. A visitor without one can read waits and keep
 * bridges on this device, but alerts, alarms, and Ask need an account.
 */
export function AccountProvider({ signedIn, children }: { signedIn: boolean; children: ReactNode }) {
  return <AccountContext.Provider value={signedIn}>{children}</AccountContext.Provider>;
}

export function useSignedIn(): boolean {
  return useContext(AccountContext);
}
