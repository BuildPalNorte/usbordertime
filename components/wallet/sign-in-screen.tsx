"use client";

import { useLocale } from "@/components/locale-provider";
import { authClient } from "@/lib/auth/client";
import { haptic } from "@/lib/haptics";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { HapticPad } from "./haptic-pad";
import { LanguageSwitch } from "./language-switch";
import { SPRING } from "./motion";
import { ThemeSwitch } from "./theme-switch";

export function SignInScreen({ problem }: { problem?: "profile" }) {
  const { copy } = useLocale();
  const reduce = useReducedMotion();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("sign-in") !== "failed") return;
    setFailed(true);
    url.searchParams.delete("sign-in");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  const signIn = async () => {
    if (busy) return;
    haptic("selection");
    setBusy(true);
    setFailed(false);
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/",
      errorCallbackURL: "/?sign-in=failed",
    });
    if (error) {
      setFailed(true);
      setBusy(false);
      haptic("error");
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="flex justify-end gap-2 px-4 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6">
        <ThemeSwitch />
        <LanguageSwitch />
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-28 text-center">
        <h1 className="text-[40px] leading-none font-bold tracking-[-0.04em]">{copy.signInTitle}</h1>
        <p className="mt-4 max-w-[18rem] text-[16px] leading-snug text-muted">{copy.signInBody}</p>

        <motion.button
          type="button"
          onClick={() => void signIn()}
          disabled={busy}
          aria-busy={busy}
          whileTap={reduce || busy ? undefined : { scale: 0.97 }}
          transition={SPRING.snap}
          className="relative mt-8 flex h-12 items-center gap-3 rounded-full bg-surface px-5 text-[15px] font-semibold text-foreground disabled:opacity-70"
        >
          <HapticPad />
          <GoogleMark />
          {copy.signInWithGoogle}
        </motion.button>

        {(failed || problem === "profile") && (
          <p className="mt-4 max-w-[18rem] text-[13px] leading-snug text-danger" role="status">
            {problem === "profile" && !failed ? copy.profileError : copy.signInFailed}
          </p>
        )}
      </div>
    </div>
  );
}

export function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5">
      <path
        fill="#4285F4"
        d="M23.04 12.26c0-.82-.07-1.6-.2-2.36H12v4.47h6.2a5.3 5.3 0 0 1-2.3 3.48v2.89h3.72c2.18-2 3.42-4.96 3.42-8.48Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.72-2.89c-1.07.72-2.44 1.15-4.22 1.15-3.24 0-5.99-2.19-6.97-5.13H1.2v2.98A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.03 14.22A7.2 7.2 0 0 1 4.65 12c0-.77.13-1.52.38-2.22V6.8H1.2A12 12 0 0 0 0 12c0 1.94.46 3.77 1.2 5.2l3.83-2.98Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.23 2.69 1.2 6.8l3.83 2.98c.98-2.94 3.73-5.01 6.97-5.01Z"
      />
    </svg>
  );
}
