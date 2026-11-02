"use client";

import { hourFromClock, usualForHour, type LaneAverages, type UsualWait } from "@/lib/lane-averages";
import type { Mode } from "@/lib/ports";
import { useQuery } from "@tanstack/react-query";

export function useLaneAverages(portNumber: string | null) {
  return useQuery({
    queryKey: ["lane-averages", portNumber],
    enabled: portNumber !== null,
    staleTime: 60 * 60 * 1000,
    queryFn: async (): Promise<LaneAverages> => {
      const response = await fetch(`/api/lane-averages?port=${portNumber}`);
      if (!response.ok) {
        throw new Error(`Lane averages request failed (${response.status})`);
      }
      return response.json();
    },
  });
}

/** Usual wait for the lane on screen, plus the high for that same hour. */
export function shownAverage(
  data: LaneAverages | undefined,
  mode: Mode,
  time: string,
  available: boolean,
): UsualWait | null {
  if (!available) return null;
  return usualForHour(data?.hours[mode], data?.high[mode], hourFromClock(time));
}
