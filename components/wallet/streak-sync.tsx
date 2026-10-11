"use client";

import { dayIn } from "@/lib/streak";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { browserTimeZone, recordVisit, STREAK_KEY } from "./use-streak";

/**
 * Mounted once for a signed-in account. Counts one visit per local day: on open, and again when an
 * installed app that stayed open overnight comes back to the front on a new day.
 */
export function StreakSync() {
  const queryClient = useQueryClient();
  const counted = useRef<string | null>(null);

  useEffect(() => {
    const count = async () => {
      const today = dayIn(browserTimeZone());
      if (counted.current === today) return;
      counted.current = today;
      const streak = await recordVisit();
      if (!streak) {
        // Try again on the next open instead of losing the day.
        counted.current = null;
        return;
      }
      queryClient.setQueryData(STREAK_KEY, streak);
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") void count();
    };

    void count();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [queryClient]);

  return null;
}
