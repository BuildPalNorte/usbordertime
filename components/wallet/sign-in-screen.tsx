"use client";

import { useLocale } from "@/components/locale-provider";
import { authClient } from "@/lib/auth/client";
import { haptic } from "@/lib/haptics";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { HapticPad } from "./haptic-pad";
import { LanguageSwitch } from "./language-switch";
import { cn } from "@/lib/cn";
import { cardBackground, PALETTES, TONE_DOT } from "@/lib/ports";
import type { CSSProperties } from "react";
import { CARD_H, PEEK, REDUCED, SPRING, stackHeight } from "./motion";
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

  const pal = (id: string) => PALETTES.find((p) => p.id === id) ?? PALETTES[0];
  // Same anatomy as the wallet: earlier cards peek above, the last one is the front card.
  const cards = [
    { name: "Nuevo", sub: "Brownsville", wait: 10, tone: "clear" as const, palette: pal("pine") },
    { name: "Viejo", sub: "Brownsville", wait: 25, tone: "busy" as const, palette: pal("clay") },
    { name: "De los tomates", sub: "Brownsville", wait: 5, tone: "clear" as const, palette: pal("cobalt") },
  ];

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="flex justify-end gap-2 px-4 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6">
        <ThemeSwitch />
        <LanguageSwitch />
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 pt-4 pb-[max(2.5rem,env(safe-area-inset-bottom))] sm:px-6">
        <div aria-hidden className="relative select-none" style={{ height: stackHeight(cards.length) }}>
          {cards.map((c, i) => {
            const front = i === cards.length - 1;
            return (
              <motion.div
                key={c.name}
                initial={reduce ? false : { opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduce ? REDUCED : { ...SPRING.move, delay: i * 0.07 }}
                className="absolute inset-x-0 overflow-hidden rounded-3xl p-[18px] text-white"
                style={{
                  top: i * PEEK,
                  height: CARD_H,
                  zIndex: i,
                  background: cardBackground(c.palette),
                  boxShadow: `0 -14px 28px -18px ${c.palette.to}cc, 0 22px 40px -22px ${c.palette.to}, inset 0 1px 0 rgb(255 255 255 / 0.22)`,
                }}
              >
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(115deg, rgb(255 255 255 / 0.04) 0 1px, transparent 1px 7px)",
                  }}
                />
                <div className="relative flex items-start justify-between gap-4">
                  <div className="min-w-0 pt-0.5">
                    <p className="truncate text-[19px] leading-[1.15] font-semibold tracking-[-0.02em]">{c.name}</p>
                    <p className="mt-1 truncate text-[13px] leading-none opacity-[0.72]">{c.sub}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="flex items-baseline justify-end gap-1">
                      <span className="text-[36px] leading-none font-semibold tracking-[-0.045em] tabular-nums">
                        {c.wait}
                      </span>
                      <span className="text-[13px] font-medium opacity-[0.72]">{copy.minuteUnit}</span>
                    </p>
                    <p className="mt-1.5 flex items-center justify-end gap-1.5 text-[12px] leading-none font-medium opacity-[0.85]">
                      <span className={cn("size-1.5 rounded-full", TONE_DOT[c.tone])} />
                      {copy.tone[c.tone]}
                    </p>
                  </div>
                </div>
                {front && (
                  <p className="absolute inset-x-[18px] bottom-[18px] text-[12px] leading-none font-medium opacity-[0.72]">
                    {copy.signInSample}
                  </p>
                )}
              </motion.div>
            );
          })}
        </div>

        <div className="rise mt-10 text-center" style={{ "--i": 4 } as CSSProperties}>
          <h1 className="text-[34px] leading-[1.05] font-bold tracking-[-0.04em] text-balance">
            {copy.signInHeadline}
          </h1>
          <p className="mx-auto mt-3 max-w-[30ch] text-[15px] leading-relaxed text-muted">{copy.signInBody}</p>

          <motion.button
            type="button"
            onClick={() => void signIn()}
            disabled={busy}
            aria-busy={busy}
            whileTap={reduce || busy ? undefined : { scale: 0.97 }}
            transition={SPRING.snap}
            className="relative mt-6 inline-flex h-12 items-center justify-center gap-3 rounded-full bg-surface px-6 text-[16px] font-semibold text-foreground disabled:opacity-70"
          >
            <HapticPad />
            <GoogleMark />
            {copy.signInWithGoogle}
          </motion.button>

          <Link href="/privacy" className="mt-4 inline-block text-[13px] font-medium text-muted">
            {copy.privacyPolicy}
          </Link>

          {(failed || problem === "profile") && (
            <p className="mx-auto mt-4 max-w-[18rem] text-[13px] leading-snug text-danger" role="status">
              {problem === "profile" && !failed ? copy.profileError : copy.signInFailed}
            </p>
          )}
        </div>
      </main>
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
