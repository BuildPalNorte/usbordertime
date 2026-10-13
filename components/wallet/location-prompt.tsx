"use client";

import { useLocale } from "@/components/locale-provider";
import type { PortWaitTime } from "@/lib/border-wait-times";
import { cn } from "@/lib/cn";
import { haptic } from "@/lib/haptics";
import { cityPinKey, pinStore } from "@/lib/pin-store";
import { nearbyBridges, type GeoPoint } from "@/lib/port-locations";
import { defaultMode, portName } from "@/lib/ports";
import { signOutAndReload } from "@/lib/sign-out";
import { walletStore } from "@/lib/wallet-store";
import { motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState, type CSSProperties } from "react";
import { HapticPad } from "./haptic-pad";
import { LanguageSwitch } from "./language-switch";
import { SPRING } from "./motion";
import { ThemeSwitch } from "./theme-switch";

type Step = "ask" | "locating" | "found" | "saving";

type Found = {
  /** Every nearby city matched, nearest first — one isn't always all there is. */
  cities: string[];
  /** One row per bridge. `city` is shown only when more than one city matched. */
  items: { title: string; city: string }[];
  /** The position they shared, saved with the account when they continue. */
  point: GeoPoint;
};

/**
 * Asks a new account whether to find their closest bridges from their location or pick
 * them by hand, then lets the bridges in. The choice itself ends the question either way.
 * A location match pauses on "found" so the matched bridges are actually seen, not just
 * swapped in behind a refresh — Continue is what moves on from there.
 */
export function LocationPrompt({ ports }: { ports: PortWaitTime[] }) {
  const { copy, locale } = useLocale();
  const router = useRouter();
  const reduce = useReducedMotion();
  const [step, setStep] = useState<Step>("ask");
  const [problem, setProblem] = useState<"denied" | "noMatch" | "failed" | null>(null);
  const [found, setFound] = useState<Found | null>(null);
  /** Set once geolocation succeeds, including when no bridge is close enough to add. */
  const [shared, setShared] = useState<GeoPoint | null>(null);

  const savePoint = (point: GeoPoint | null) =>
    fetch("/api/location-onboarding", {
      method: "POST",
      ...(point
        ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(point) }
        : {}),
    });

  const finish = async (point: GeoPoint | null) => {
    setStep("saving");
    try {
      const response = await savePoint(point);
      if (!response.ok) throw new Error("save");
    } catch {
      // The browser already has the choice applied. The next sign-in asks again at worst.
    }
    router.refresh();
  };

  const useLocation = () => {
    if (step !== "ask") return;
    haptic("selection");
    setProblem(null);
    setStep("locating");

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      haptic("error");
      setProblem("denied");
      setStep("ask");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point = { lat: position.coords.latitude, lng: position.coords.longitude };
        setShared(point);
        // Store it before Continue. A later tap that omits the body must not be the only save.
        void savePoint(point);
        const match = nearbyBridges(ports, point);
        if (!match) {
          haptic("error");
          setProblem("noMatch");
          setStep("ask");
          return;
        }

        walletStore.addMany(
          match.ports.map((port) => ({ portNumber: port.portNumber, mode: defaultMode(port) })),
        );
        for (const city of match.cities) pinStore.toggle(cityPinKey(city.border, city.city));
        haptic("success");
        setFound({
          cities: match.cities.map((city) => city.city),
          items: match.ports.map((port) => ({ title: portName(port).title, city: portName(port).city })),
          point,
        });
        setStep("found");
      },
      () => {
        haptic("error");
        setProblem("denied");
        setStep("ask");
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  };

  const choose = () => {
    if (step !== "ask") return;
    haptic("selection");
    void finish(shared);
  };

  const busy = step === "locating" || step === "saving";

  const signOut = () => {
    if (busy) return;
    haptic("light");
    setStep("saving");
    void (async () => {
      await signOutAndReload();
    })();
  };

  // Stay on the found screen while saving, so Continue doesn't flash the question again
  // before the refresh swaps in the wallet and its cards fan in.
  if (found && (step === "found" || step === "saving")) {
    return (
      <Found
        copy={copy}
        locale={locale}
        reduce={reduce}
        found={found}
        saving={step === "saving"}
        onContinue={() => {
          if (step === "found") void finish(found.point);
        }}
      />
    );
  }

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex shrink-0 justify-end gap-2 px-4 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6">
        <ThemeSwitch />
        <LanguageSwitch />
      </header>

      <div className="mx-auto flex w-full max-w-md min-h-0 flex-1 flex-col px-4 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6">
        <div className="rise shrink-0" style={{ "--i": 0 } as CSSProperties}>
          <h1 className="text-[34px] leading-[1.05] font-bold tracking-[-0.04em] text-balance">
            {copy.locationTitle}
          </h1>
          <p className="mt-3 max-w-[32ch] text-[15px] leading-relaxed text-muted">{copy.locationBody}</p>
        </div>

        <div className="mt-6 flex min-h-0 flex-1 flex-col justify-center gap-3">
          <div className="rise" style={{ "--i": 1 } as CSSProperties}>
            <button
              type="button"
              onClick={useLocation}
              disabled={busy}
              aria-busy={step === "locating"}
              className="relative h-12 w-full rounded-full bg-accent text-[16px] font-semibold text-accent-ink disabled:opacity-40"
            >
              <HapticPad />
              {step === "locating" ? copy.locationFinding : copy.locationShareOption}
            </button>
          </div>

          <div className="rise" style={{ "--i": 2 } as CSSProperties}>
            <button
              type="button"
              onClick={choose}
              disabled={busy}
              className="relative h-12 w-full rounded-2xl bg-surface text-[16px] font-medium text-foreground disabled:opacity-40"
            >
              <HapticPad />
              {copy.locationManualOption}
            </button>
          </div>

          {problem && (
            <p className="mt-2 text-center text-[13px] leading-snug text-danger" role="alert">
              {problem === "noMatch" ? copy.locationNoMatch : copy.locationDenied}
            </p>
          )}
        </div>

        <div className={cn("rise shrink-0", problem && "mt-2")} style={{ "--i": 3 } as CSSProperties}>
          <button
            type="button"
            onClick={signOut}
            disabled={busy}
            className="mx-auto mt-4 block text-[13px] font-medium text-muted disabled:opacity-40"
          >
            {copy.signOut}
          </button>
        </div>
      </div>
    </div>
  );
}

/** The matched cities and their bridges, shown before handing off to the wallet. */
function Found({
  copy,
  locale,
  reduce,
  found,
  saving,
  onContinue,
}: {
  saving: boolean;
  copy: ReturnType<typeof useLocale>["copy"];
  locale: string;
  reduce: boolean | null;
  found: Found;
  onContinue: () => void;
}) {
  const cityList = new Intl.ListFormat(locale, { style: "long", type: "conjunction" }).format(
    found.cities,
  );
  const showCity = found.cities.length > 1;

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex shrink-0 justify-end gap-2 px-4 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6">
        <ThemeSwitch />
        <LanguageSwitch />
      </header>

      <div className="mx-auto flex w-full max-w-md min-h-0 flex-1 flex-col px-4 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6">
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col items-center justify-center text-center transition-[opacity,transform] duration-300 ease-out",
            saving && "scale-[0.97] opacity-40",
          )}
        >
          <div className="relative grid size-16 shrink-0 place-items-center">
            {!reduce &&
              [0, 1, 2].map((ring) => (
                <motion.span
                  key={ring}
                  aria-hidden
                  initial={{ opacity: 0.45, scale: 1 }}
                  animate={{ opacity: 0, scale: 3.2 }}
                  transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.15 + ring * 0.22 }}
                  className="absolute inset-0 rounded-full border-2 border-accent"
                />
              ))}
            <motion.div
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={SPRING.pop}
              className="relative grid size-16 place-items-center rounded-full bg-accent text-accent-ink"
            >
              <Check draw={!reduce} />
            </motion.div>
          </div>

          <motion.h1
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING.move, delay: reduce ? 0 : 0.1 }}
            className="mt-5 max-w-[26ch] text-[26px] leading-[1.1] font-bold tracking-[-0.02em] text-balance"
          >
            {copy.locationFoundTitle(cityList)}
          </motion.h1>
          <motion.p
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING.move, delay: reduce ? 0 : 0.15 }}
            className="mt-2 text-[14px] text-muted"
          >
            {copy.locationFoundBody(found.items.length)}
          </motion.p>

          <ul className="mt-7 w-full space-y-2">
            {found.items.map((item, index) => (
              <motion.li
                key={`${item.city}-${item.title}`}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ ...SPRING.pop, delay: reduce ? 0 : 0.2 + index * 0.07 }}
                className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 text-left"
              >
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent/15 text-accent">
                  <Check small />
                </span>
                <span className="min-w-0 flex-1 truncate text-[15px] font-medium">
                  {item.title}
                  {showCity && (
                    <span className="ml-1.5 truncate text-[12px] font-normal text-muted">{item.city}</span>
                  )}
                </span>
              </motion.li>
            ))}
          </ul>
        </div>

        <motion.div
          className="shrink-0"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING.move, delay: reduce ? 0 : 0.2 + found.items.length * 0.07 + 0.1 }}
        >
          <button
            type="button"
            onClick={onContinue}
            disabled={saving}
            aria-busy={saving}
            className="relative grid h-12 w-full place-items-center rounded-full bg-accent text-[16px] font-semibold text-accent-ink"
          >
            <HapticPad />
            {saving ? (
              <svg
                viewBox="0 0 24 24"
                aria-hidden
                className={cn("size-5", reduce ? "animate-pulse" : "animate-spin")}
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              >
                <circle cx="12" cy="12" r="9" opacity="0.25" />
                <path d="M21 12a9 9 0 0 0-9-9" />
              </svg>
            ) : (
              copy.locationContinue
            )}
          </button>
        </motion.div>
      </div>
    </div>
  );
}

function Check({ small, draw }: { small?: boolean; draw?: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className={small ? "size-3.5 shrink-0" : "size-7 shrink-0"}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {draw ? (
        <motion.path
          d="M3.5 8.5 6.5 11.5 12.5 4.5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1], delay: 0.2 }}
        />
      ) : (
        <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
      )}
    </svg>
  );
}
