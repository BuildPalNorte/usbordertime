"use client";

import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/cn";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "acquisition", label: "Acquisition" },
  { id: "accounts", label: "Accounts" },
  { id: "usage", label: "Usage" },
  { id: "cameras", label: "Cameras" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/** Critically damped - a tab switch is a selection, not a gesture with momentum to carry. */
const SNAP = { type: "spring" as const, bounce: 0, duration: 0.32 };

/**
 * Pre-rendered content for each tab, built by the server component above. This component only
 * decides which one shows - it never fetches or shapes data itself.
 *
 * The bar is a translucent layer that stays under the header while a long tab scrolls beneath it.
 * Arrow keys, Home and End move between tabs.
 */
export function AdminTabs({ overview, acquisition, accounts, usage, cameras }: Record<TabId, ReactNode>) {
  const [tab, setTab] = useState<TabId>("overview");
  const reduce = useReducedMotion();
  const buttons = useRef<Partial<Record<TabId, HTMLButtonElement | null>>>({});
  const panels: Record<TabId, ReactNode> = { overview, acquisition, accounts, usage, cameras };

  const select = (id: TabId, focus = false) => {
    if (id !== tab) {
      haptic("selection");
      setTab(id);
    }
    if (focus) buttons.current[id]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = TABS.findIndex((item) => item.id === tab);
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % TABS.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + TABS.length) % TABS.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = TABS.length - 1;
    else return;
    event.preventDefault();
    select(TABS[next].id, true);
  };

  return (
    <div className="min-w-0">
      <div
        className={cn(
          "sticky top-0 z-20 -mx-4 px-4 pt-[env(safe-area-inset-top)] sm:-mx-6 sm:px-6",
          "bg-background/80 backdrop-blur-xl backdrop-saturate-150",
          "[@media(prefers-reduced-transparency:reduce)]:bg-background [@media(prefers-reduced-transparency:reduce)]:backdrop-blur-none",
          // Scroll edge: content fades under the bar instead of meeting a hard line.
          "after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-5 after:bg-gradient-to-b after:from-background/80 after:to-transparent",
        )}
      >
        <div
          role="tablist"
          aria-label="Admin sections"
          onKeyDown={onKeyDown}
          className="no-scrollbar flex gap-1 overflow-x-auto py-2"
        >
          {TABS.map((item) => {
            const active = item.id === tab;
            return (
              <button
                key={item.id}
                ref={(node) => {
                  buttons.current[item.id] = node;
                }}
                id={`admin-tab-${item.id}`}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls="admin-panel"
                tabIndex={active ? 0 : -1}
                onClick={() => select(item.id)}
                className={cn(
                  "relative min-h-11 shrink-0 rounded-full px-4 text-[14px] font-medium whitespace-nowrap transition-colors duration-150",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
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
      </div>

      <div className="relative mt-6 min-w-0">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            id="admin-panel"
            role="tabpanel"
            aria-labelledby={`admin-tab-${tab}`}
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
