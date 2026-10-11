"use client";

import { createContext, useContext, type ReactNode } from "react";

const AdminAccessContext = createContext(false);

/** Server passes whether this session may open `/admin`. The email list stays on the server. */
export function AdminAccess({ allowed, children }: { allowed: boolean; children: ReactNode }) {
  return <AdminAccessContext.Provider value={allowed}>{children}</AdminAccessContext.Provider>;
}

export function useAdminAccess(): boolean {
  return useContext(AdminAccessContext);
}
