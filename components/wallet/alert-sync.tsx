"use client";

import { resyncPush } from "@/lib/push-client";
import { useEffect, useRef } from "react";
import { useAlerts } from "./use-alerts";
import { useSchedules } from "./use-schedules";

/**
 * Mounted once for a signed-in account. If that account has alerts or schedules, this device
 * re-registers itself so the server holds a current push address. It never asks for permission.
 */
export function AlertSync() {
  const { alerts } = useAlerts();
  const { schedules } = useSchedules();
  const done = useRef(false);
  const count = (alerts?.length ?? 0) + (schedules?.length ?? 0);

  useEffect(() => {
    if (done.current || count === 0) return;
    done.current = true;
    void resyncPush();
  }, [count]);

  return null;
}
