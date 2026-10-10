"use client";

import { useLocale } from "@/components/locale-provider";
import { cn } from "@/lib/cn";
import { MapIcon } from "@heroicons-animated/react/map";
import { WalletIcon } from "@heroicons-animated/react/wallet";
import { motion, useReducedMotion } from "motion/react";
import { SPRING } from "./motion";

export type Tab = "wallet" | "browse";

type Props = {
  tab: Tab;
  count: number;
  onChange: (tab: Tab) => void;
};

/** Floating translucent tab bar. Mobile only; desktop shows both panes. */
export function TabBar({ tab, count, onChange }: Props) {
  const { copy } = useLocale();
  const reduce = useReducedMotion();

  return (
    <nav
      aria-label={copy.sections}
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 lg:hidden"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <div className="glass pointer-events-auto flex gap-1 rounded-full p-1.5">
        <TabButton active={tab === "wallet"} label={copy.wallet} onClick={() => onChange("wallet")}>
          <WalletIcon size={22} aria-hidden />
          {count > 0 && (
            <motion.span
              // Re-keyed on count so the badge pops each time the wallet grows or shrinks.
              key={count}
              initial={reduce ? false : { scale: 0.4 }}
              animate={{ scale: 1 }}
              transition={SPRING.pop}
              className="absolute top-1.5 right-3 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[11px] leading-none font-bold text-accent-ink tabular-nums"
            >
              {count}
            </motion.span>
          )}
        </TabButton>
        <TabButton active={tab === "browse"} label={copy.browse} onClick={() => onChange("browse")}>
          <MapIcon size={22} aria-hidden />
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
