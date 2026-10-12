"use client";

import { haptic } from "@/lib/haptics";
import { signOutAndReload } from "@/lib/sign-out";
import { useState } from "react";

export function SignOutButton() {
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        if (busy) return;
        setBusy(true);
        haptic("light");
        void (async () => {
          await signOutAndReload();
        })();
      }}
      className="text-[15px] font-medium text-muted disabled:opacity-50"
    >
      Sign out
    </button>
  );
}
