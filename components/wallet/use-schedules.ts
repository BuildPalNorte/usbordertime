"use client";

import { isMode } from "@/lib/ports";
import { isTimeZone, type Schedule, type ScheduleInput } from "@/lib/schedule";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

const SCHEDULES_KEY = ["schedules"] as const;

function parse(item: unknown): Schedule[] {
  const entry = item as Partial<Schedule> | null;
  if (
    !entry ||
    typeof entry.id !== "string" ||
    typeof entry.minute !== "number" ||
    !Array.isArray(entry.days) ||
    !Array.isArray(entry.ports) ||
    !isMode(entry.mode) ||
    !isTimeZone(entry.timeZone)
  ) {
    return [];
  }
  return [
    {
      id: entry.id,
      minute: entry.minute,
      days: entry.days.filter((day): day is number => typeof day === "number"),
      timeZone: entry.timeZone,
      mode: entry.mode,
      ports: entry.ports.filter((port): port is string => typeof port === "string"),
      enabled: entry.enabled !== false,
    },
  ];
}

async function fetchSchedules(): Promise<Schedule[]> {
  const response = await fetch("/api/schedules", { cache: "no-store" });
  if (!response.ok) throw new Error(`Schedules request failed (${response.status})`);
  const body: unknown = await response.json();
  return Array.isArray(body) ? body.flatMap(parse) : [];
}

export type ScheduleSaveResult =
  | { status: "ok"; schedule: Schedule }
  | { status: "limit" | "missing" | "failed" };

function byTime(a: Schedule, b: Schedule): number {
  return a.minute - b.minute;
}

/** This account's schedules: the list, and save, pause or delete one. */
export function useSchedules() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: SCHEDULES_KEY,
    queryFn: fetchSchedules,
    staleTime: 60_000,
    retry: false,
  });

  const save = useCallback(
    async (input: ScheduleInput): Promise<ScheduleSaveResult> => {
      try {
        const response = await fetch("/api/schedules", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        if (response.status === 409) return { status: "limit" };
        if (response.status === 404) return { status: "missing" };
        if (!response.ok) return { status: "failed" };
        const [schedule] = parse(await response.json());
        if (!schedule) return { status: "failed" };
        queryClient.setQueryData<Schedule[]>(SCHEDULES_KEY, (current) =>
          [...(current ?? []).filter((item) => item.id !== schedule.id), schedule].sort(byTime),
        );
        return { status: "ok", schedule };
      } catch {
        return { status: "failed" };
      }
    },
    [queryClient],
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const response = await fetch(`/api/schedules?id=${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
        if (!response.ok) return false;
        queryClient.setQueryData<Schedule[]>(SCHEDULES_KEY, (current) =>
          (current ?? []).filter((item) => item.id !== id),
        );
        return true;
      } catch {
        return false;
      }
    },
    [queryClient],
  );

  return {
    schedules: query.data,
    loading: query.isPending,
    failed: query.isError,
    refetch: query.refetch,
    save,
    remove,
  };
}
