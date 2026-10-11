"use client";

import { themeStore } from "@/lib/theme-store";
import type { ThemeChoice } from "@/lib/theme";
import { useCallback, useLayoutEffect, useSyncExternalStore, type ReactNode } from "react";

/** Applies a saved appearance. With no choice, the document follows the system. */
export function ThemeProvider({ theme, children }: { theme: ThemeChoice | null; children: ReactNode }) {
  const getSnapshot = useCallback(() => themeStore.getSnapshot(theme), [theme]);
  const getServerSnapshot = useCallback(() => theme, [theme]);
  const choice = useSyncExternalStore(themeStore.subscribe, getSnapshot, getServerSnapshot);

  useLayoutEffect(() => {
    themeStore.apply(choice);
  }, [choice]);

  return children;
}
