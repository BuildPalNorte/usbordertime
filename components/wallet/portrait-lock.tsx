"use client";

import { applyScreenOrientation } from "@/lib/screen-orientation";
import { useEffect } from "react";

/** Asks a phone to stay portrait. The camera releases that while it is expanded. */
export function PortraitLock() {
  useEffect(() => {
    const apply = () => applyScreenOrientation();
    apply();
    // lock() needs a user gesture in several browsers, so each tap retries a refusal.
    window.addEventListener("pointerdown", apply, { passive: true });
    window.addEventListener("resize", apply);
    document.addEventListener("visibilitychange", apply);
    return () => {
      window.removeEventListener("pointerdown", apply);
      window.removeEventListener("resize", apply);
      document.removeEventListener("visibilitychange", apply);
    };
  }, []);

  return null;
}
