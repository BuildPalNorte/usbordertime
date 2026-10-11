"use client";

import { alertKey, type WaitAlert } from "@/lib/alert";
import { isMode, type Mode } from "@/lib/ports";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

const ALERTS_KEY = ["alerts"] as const;

async function fetchAlerts(): Promise<WaitAlert[]> {
  const response = await fetch("/api/alerts", { cache: "no-store" });
  if (!response.ok) throw new Error(`Alerts request failed (${response.status})`);
  const body: unknown = await response.json();
  if (!Array.isArray(body)) return [];
  return body.flatMap((item) => {
    const entry = item as Partial<WaitAlert> | null;
    if (!entry || typeof entry.portNumber !== "string" || typeof entry.threshold !== "number") {
      return [];
    }
    return isMode(entry.mode)
      ? [{ portNumber: entry.portNumber, mode: entry.mode, threshold: entry.threshold }]
      : [];
  });
}

export type AlertSaveResult = "ok" | "limit" | "failed";

/** This account's wait alerts, and the two things you can do to one: set it, or turn it off. */
export function useAlerts() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ALERTS_KEY,
    queryFn: fetchAlerts,
    staleTime: 60_000,
    retry: false,
  });

  const alerts = query.data;
  const byLane = useMemo(
    () => new Map((alerts ?? []).map((alert) => [alertKey(alert.portNumber, alert.mode), alert])),
    [alerts],
  );

  const find = useCallback(
    (portNumber: string, mode: Mode): WaitAlert | undefined =>
      byLane.get(alertKey(portNumber, mode)),
    [byLane],
  );

  const set = useCallback(
    async (alert: WaitAlert): Promise<AlertSaveResult> => {
      try {
        const response = await fetch("/api/alerts", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(alert),
        });
        if (response.status === 409) return "limit";
        if (!response.ok) return "failed";
        queryClient.setQueryData<WaitAlert[]>(ALERTS_KEY, (current) => [
          ...(current ?? []).filter(
            (item) => alertKey(item.portNumber, item.mode) !== alertKey(alert.portNumber, alert.mode),
          ),
          alert,
        ]);
        return "ok";
      } catch {
        return "failed";
      }
    },
    [queryClient],
  );

  const clear = useCallback(
    async (portNumber: string, mode: Mode): Promise<boolean> => {
      try {
        const params = new URLSearchParams({ port: portNumber, mode });
        const response = await fetch(`/api/alerts?${params.toString()}`, { method: "DELETE" });
        if (!response.ok) return false;
        queryClient.setQueryData<WaitAlert[]>(ALERTS_KEY, (current) =>
          (current ?? []).filter(
            (item) => alertKey(item.portNumber, item.mode) !== alertKey(portNumber, mode),
          ),
        );
        return true;
      } catch {
        return false;
      }
    },
    [queryClient],
  );

  return { alerts, find, set, clear };
}
