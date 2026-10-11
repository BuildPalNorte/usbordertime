"use client";

import { useLocale } from "@/components/locale-provider";
import { cn } from "@/lib/cn";
import { notePadTick } from "@/lib/haptics";
import { ClockIcon, type ClockIconHandle } from "@heroicons-animated/react/clock";
import { MapIcon, type MapIconHandle } from "@heroicons-animated/react/map";
import { WalletIcon, type WalletIconHandle } from "@heroicons-animated/react/wallet";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { HapticPad } from "./haptic-pad";
import { SPRING } from "./motion";

export type Tab = "wallet" | "browse" | "schedules";

type Props = {
  tab: Tab;
  onChange: (tab: Tab) => void;
};

/**
 * Floating translucent tab bar. Mobile only; desktop shows both panes.
 * Three labels would not fit a phone, so only the tab you are on shows its name.
 */
export function TabBar({ tab, onChange }: Props) {
  const { copy } = useLocale();
  const reduce = useReducedMotion();
  const wallet = useRef<WalletIconHandle>(null);
  const map = useRef<MapIconHandle>(null);
  const clock = useRef<ClockIconHandle>(null);

  function select(next: Tab) {
    if (!reduce && next !== tab) {
      (next === "wallet" ? wallet : next === "browse" ? map : clock).current?.startAnimation();
    }
    onChange(next);
  }

  return (
    <nav
      aria-label={copy.sections}
      className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center px-4 lg:hidden"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <div className="pointer-events-auto relative flex cursor-pointer gap-1 rounded-full p-1.5">
        <div aria-hidden className="glass pointer-events-none absolute inset-0 rounded-full" />
        <TabButton active={tab === "wallet"} label={copy.wallet} onClick={() => select("wallet")}>
          <WalletIcon ref={wallet} size={22} aria-hidden />
        </TabButton>
        <TabButton active={tab === "browse"} label={copy.browse} onClick={() => select("browse")}>
          <MapIcon ref={map} size={22} aria-hidden className="[perspective:48px]" />
        </TabButton>
        <TabButton
          active={tab === "schedules"}
          label={copy.schedules}
          onClick={() => select("schedules")}
        >
          <ClockIcon ref={clock} size={22} aria-hidden />
        </TabButton>
      </div>
    </nav>
  );
}

function TabButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const origin = useRef<{ id: number; x: number; y: number } | null>(null);
  // A swipe leaves the browser unwilling to synthesize a click for the next
  // finger tap, so the tab would sit there until a second tap. The lift still
  // arrives. Switch on that, and ignore the click if it shows up afterward.
  const skipClick = useRef(false);
  const skipTimer = useRef(0);

  useEffect(() => () => window.clearTimeout(skipTimer.current), []);

  function onPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    origin.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
  }

  function onPointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    const start = origin.current;
    origin.current = null;
    if (!start || event.pointerId !== start.id || event.pointerType === "mouse") return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (dx * dx + dy * dy > 100) return;
    skipClick.current = true;
    window.clearTimeout(skipTimer.current);
    skipTimer.current = window.setTimeout(() => {
      skipClick.current = false;
    }, 500);
    // The switch under the finger ticks when its click arrives. Skip the copy.
    notePadTick();
    onClick();
  }

  function onActivate() {
    if (skipClick.current) {
      skipClick.current = false;
      window.clearTimeout(skipTimer.current);
      return;
    }
    onClick();
  }

  return (
    <motion.button
      type="button"
      aria-current={active ? "page" : undefined}
      aria-label={label}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        origin.current = null;
      }}
      onClick={onActivate}
      whileTap={reduce ? undefined : { scale: 0.94 }}
      transition={SPRING.snap}
      className={cn(
        "relative z-[1] flex h-12 cursor-pointer touch-manipulation items-center justify-center rounded-full text-[15px] font-semibold whitespace-nowrap",
        active ? "px-5 text-foreground" : "px-[18px] text-muted",
      )}
    >
      {!active && <HapticPad />}
      {active && (
        <motion.span
          layoutId="tab-pill"
          aria-hidden
          className="absolute inset-0 rounded-full bg-foreground/[0.09]"
          style={{ boxShadow: "inset 0 1px 0 var(--glass-highlight)" }}
          transition={SPRING.snap}
        />
      )}
      <span className="relative flex items-center">
        {children}
        <AnimatePresence initial={false}>
          {active && (
            <motion.span
              key="label"
              initial={reduce ? { opacity: 0 } : { opacity: 0, width: 0 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, width: "auto" }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, width: 0 }}
              transition={reduce ? { duration: 0.12 } : SPRING.snap}
              className="overflow-hidden"
            >
              <span className="block pl-2">{label}</span>
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </motion.button>
  );
}
