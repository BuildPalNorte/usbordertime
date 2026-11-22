"use client";

import {
  hourFromClock,
  outlookFor,
  usualForHour,
  type LaneAverages,
  type Outlook,
  type UsualWait,
} from "@/lib/lane-averages";
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

/**
 * Where the wait on this lane is expected to go over the next hour. Null while the past weeks load,
 * when they are missing, or when the lane has no live minutes (closed, pending, not offered).
 */
export function shownOutlook(
  data: LaneAverages | undefined,
  mode: Mode,
  time: string,
  available: boolean,
  live: number | null,
): Outlook | null {
  if (!available || live === null) return null;
  return outlookFor(data?.typical?.[mode], live, time);
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
