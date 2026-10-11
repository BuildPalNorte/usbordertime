"use client";

import { themeStore } from "@/lib/theme-store";
import { useLayoutEffect, useSyncExternalStore, type ReactNode } from "react";

function serverTheme(): null {
  return null;
}

/** Keeps the document on the device color scheme, including when that scheme changes. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const choice = useSyncExternalStore(themeStore.subscribe, themeStore.getSnapshot, serverTheme);

  useLayoutEffect(() => {
    themeStore.apply(choice);
  }, [choice]);

  return children;
}
