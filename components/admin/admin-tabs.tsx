"use client";

import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/cn";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState, type ReactNode } from "react";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "accounts", label: "Accounts" },
  { id: "crossings", label: "Crossings" },
  { id: "cameras", label: "Cameras" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/** Critically damped - a tab switch is a selection, not a gesture with momentum to carry. */
const SNAP = { type: "spring" as const, bounce: 0, duration: 0.32 };

/**
 * Pre-rendered content for each tab, built by the server component above. This component only
 * decides which one shows - it never fetches or shapes data itself.
 */
export function AdminTabs({
  overview,
  accounts,
  crossings,
  cameras,
}: Record<TabId, ReactNode>) {
  const [tab, setTab] = useState<TabId>("overview");
  const reduce = useReducedMotion();
  const panels: Record<TabId, ReactNode> = { overview, accounts, crossings, cameras };

  return (
    <div className="min-w-0">
      <div
        role="tablist"
        aria-label="Admin sections"
        className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0"
      >
        {TABS.map((item) => {
          const active = item.id === tab;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                if (active) return;
                haptic("selection");
                setTab(item.id);
              }}
              className={cn(
                "relative shrink-0 rounded-full px-4 py-2 text-[14px] font-medium whitespace-nowrap transition-colors duration-150",
                active ? "text-background" : "text-muted active:text-foreground",
              )}
            >
              {active && (
                <motion.span
                  layoutId="admin-tab-pill"
                  aria-hidden
                  className="absolute inset-0 rounded-full bg-foreground"
                  transition={SNAP}
                />
              )}
              <span className="relative">{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="relative mt-6 min-w-0">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={reduce ? { duration: 0.12 } : SNAP}
            className="min-w-0"
          >
            {panels[tab]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
