"use client";

import { TramitesSkeleton } from "@/components/tramites/tramites-skeleton";
import { ShellSkeleton } from "@/components/wallet/shell-skeleton";
import { usePathname } from "next/navigation";

/** Root Suspense fallback: tramites gets its own shell; everything else keeps the wallet one. */
export function BootSkeleton() {
  const path = usePathname();
  if (path === "/tramites" || path.startsWith("/tramites/")) {
    return <TramitesSkeleton />;
  }
  return <ShellSkeleton wordless />;
}
