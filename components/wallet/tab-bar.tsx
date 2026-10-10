"use client";

import { useLocale } from "@/components/locale-provider";
import { cn } from "@/lib/cn";
import { MapIcon, type MapIconHandle } from "@heroicons-animated/react/map";
import { WalletIcon, type WalletIconHandle } from "@heroicons-animated/react/wallet";
import { motion, useReducedMotion } from "motion/react";
import { useRef } from "react";
import { HapticPad } from "./haptic-pad";
import { SPRING } from "./motion";

export type Tab = "wallet" | "browse";

type Props = {
  tab: Tab;
  onChange: (tab: Tab) => void;
};

/** Floating translucent tab bar. Mobile only; desktop shows both panes. */
export function TabBar({ tab, onChange }: Props) {
  const { copy } = useLocale();
  const reduce = useReducedMotion();
  const wallet = useRef<WalletIconHandle>(null);
  const map = useRef<MapIconHandle>(null);

  function select(next: Tab) {
    if (!reduce && next !== tab) {
      (next === "wallet" ? wallet : map).current?.startAnimation();
    }
    onChange(next);
  }

  return (
    <nav
      aria-label={copy.sections}
      className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center px-4 lg:hidden"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <div className="glass pointer-events-auto flex gap-1 rounded-full p-1.5">
        <TabButton active={tab === "wallet"} label={copy.wallet} onClick={() => select("wallet")}>
          <WalletIcon ref={wallet} size={22} aria-hidden />
        </TabButton>
        <TabButton active={tab === "browse"} label={copy.browse} onClick={() => select("browse")}>
          <MapIcon ref={map} size={22} aria-hidden className="[perspective:48px]" />
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

  return (
    <motion.button
      type="button"
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      whileTap={reduce ? undefined : { scale: 0.94 }}
      transition={SPRING.snap}
      className={cn(
        "relative flex h-12 items-center justify-center gap-2 rounded-full px-5 text-[15px] font-semibold whitespace-nowrap",
        active ? "text-foreground" : "text-muted",
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
      <span className="relative flex items-center gap-2">
        {children}
        {label}
      </span>
    </motion.button>
  );
}
