"use client";

import { whenVisitorNoted } from "@/lib/visitor-ready";
import { useEffect } from "react";

const STORAGE_KEY = "usbordertime.open";
/** A reload while the welcome questions are still on screen is the same entry. */
const MOUNT_GAP_MS = 2 * 60 * 1000;
/** Coming back after being away this long is another entry. */
const AWAY_MS = 30 * 1000;

let pending = false;

function lastSent(): number {
  try {
    const last = Number(sessionStorage.getItem(STORAGE_KEY));
    return Number.isFinite(last) ? last : 0;
  } catch {
    return 0;
  }
}

async function sendOpen(): Promise<void> {
  if (pending) return;
  pending = true;
  try {
    // A first-time guest gets their visitor cookie from the note `GuestEntry` sends. Wait for it.
    await whenVisitorNoted();
    const response = await fetch("/api/opens", { method: "POST", keepalive: true });
    if (!response.ok) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      // The server still collapses a burst when storage is blocked.
    }
  } catch {
    // The next open tries again.
  } finally {
    pending = false;
  }
}

/**
 * Counts one use when the app opens, and another when it returns to the front after being away.
 * A signed-in account and a guest both post here; the server files the guest on the visitor cookie.
 * A reload in the same tab within two minutes does not.
 */
export function OpenSync() {
  useEffect(() => {
    let hiddenAt: number | null = null;
    if (Date.now() - lastSent() >= MOUNT_GAP_MS) void sendOpen();

    const onVisible = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
        return;
      }
      if (hiddenAt !== null && Date.now() - hiddenAt >= AWAY_MS) void sendOpen();
      hiddenAt = null;
    };

    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  return null;
}
