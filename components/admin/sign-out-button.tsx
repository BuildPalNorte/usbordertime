"use client";

import { authClient } from "@/lib/auth/client";
import { haptic } from "@/lib/haptics";
import { disablePush } from "@/lib/push-client";
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
          await disablePush();
          await authClient.signOut();
          window.location.assign("/");
        })();
      }}
      className="text-[15px] font-medium text-muted disabled:opacity-50"
    >
      Sign out
    </button>
  );
}
