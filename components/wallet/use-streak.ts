"use client";

import { isDay, type StreakView } from "@/lib/streak";
import { useQuery } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

export const STREAK_KEY = ["streak"] as const;

export function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function parseStreak(body: unknown): StreakView | null {
  const entry = body as Partial<StreakView> | null;
  if (
    !entry ||
    typeof entry.current !== "number" ||
    typeof entry.longest !== "number" ||
    typeof entry.totalDays !== "number" ||
    !(entry.lastDay === null || isDay(entry.lastDay))
  ) {
    return null;
  }
  return {
    current: entry.current,
    longest: entry.longest,
    totalDays: entry.totalDays,
    lastDay: entry.lastDay,
    today: entry.today === true,
    advanced: entry.advanced === true,
  };
}

/** Counts today's visit, and returns the streak after it. Null when the server could not. */
export async function recordVisit(): Promise<StreakView | null> {
  try {
    const response = await fetch("/api/streak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timeZone: browserTimeZone() }),
    });
    if (!response.ok) return null;
    return parseStreak(await response.json());
  } catch {
    return null;
  }
}

/**
 * This account's streak. The cache is filled by `StreakSync` when it counts a visit, so this never
 * fetches on its own and stays empty until that visit lands.
 *
 * That sync sits outside the wallet, so its result can be in the cache before the wallet hydrates.
 * The server render has no streak. Reading it during hydration would put the chip where the server
 * drew the account button, and React would rebuild the page. It appears on the commit after.
 */
export function useStreak(): StreakView | null {
  const query = useQuery<StreakView | null>({
    queryKey: STREAK_KEY,
    queryFn: () => null,
    enabled: false,
    initialData: null,
    staleTime: Infinity,
  });
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  return mounted ? (query.data ?? null) : null;
}
