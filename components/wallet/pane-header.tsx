"use client";

import { useLocale } from "@/components/locale-provider";
import { haptic } from "@/lib/haptics";
import { ArrowPathIcon } from "@heroicons-animated/react/arrow-path";
import { PlusIcon } from "@heroicons-animated/react/plus";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { AccountButton } from "./account-button";
import { HapticPad } from "./haptic-pad";
import { SPRING } from "./motion";
import { StreakChip } from "./streak-chip";

/** What the right-hand header control is on this tab. "none" leaves the streak and account where they are. */
export type PaneAction = "refresh" | "done" | "add" | "none";

export type PaneChrome = {
  subtitle: string;
  action: PaneAction;
  checking: boolean;
  refreshing: boolean;
};

type Handlers = {
  onRefresh: () => void;
  onDone: () => void;
  onAdd: () => void;
};

type ChromeContextValue = {
  chrome: PaneChrome;
  publish: (chrome: PaneChrome) => void;
  bind: (handlers: RefObject<Handlers>) => void;
  run: (key: keyof Handlers) => void;
};

const ChromeContext = createContext<ChromeContextValue | null>(null);

function sameChrome(a: PaneChrome, b: PaneChrome) {
  return (
    a.subtitle === b.subtitle &&
    a.action === b.action &&
    a.checking === b.checking &&
    a.refreshing === b.refreshing
  );
}

export function PaneChromeProvider({
  initial,
  children,
}: {
  initial: PaneChrome;
  children: ReactNode;
}) {
  const [chrome, setChrome] = useState<PaneChrome>(initial);
  const handlers = useRef<RefObject<Handlers> | null>(null);

  const publish = useCallback((next: PaneChrome) => {
    setChrome((prev) => (sameChrome(prev, next) ? prev : next));
  }, []);

  const bind = useCallback((next: RefObject<Handlers>) => {
    handlers.current = next;
  }, []);

  const run = useCallback((key: keyof Handlers) => {
    handlers.current?.current[key]();
  }, []);

  return (
    <ChromeContext.Provider value={{ chrome, publish, bind, run }}>{children}</ChromeContext.Provider>
  );
}

/** The active pane reports the subtitle and the button that differ from the other tabs. */
export function usePublishPaneChrome(live: boolean, chrome: PaneChrome, handlers: Handlers) {
  const ctx = useContext(ChromeContext);
  const latest = useRef(handlers);
  useLayoutEffect(() => {
    latest.current = handlers;
  });
  const { subtitle, action, checking, refreshing } = chrome;
  const publish = ctx?.publish;
  const bind = ctx?.bind;

  useLayoutEffect(() => {
    if (!live || !publish || !bind) return;
    bind(latest);
    publish({ subtitle, action, checking, refreshing });
  }, [live, publish, bind, subtitle, action, checking, refreshing]);
}

const SWAP = {
  duration: 0.2,
  ease: [0.16, 1, 0.3, 1] as const,
};

/**
 * Phone header. It stays mounted across tabs, so the streak and the account button never travel.
 * The title and subtitle crossfade, because those words change. The body below slides on its own.
 */
export function MobilePaneHeader({ tab, title }: { tab: string; title: string }) {
  const reduce = useReducedMotion();
  const { chrome, run } = usePaneChrome();

  return (
    <header className="sticky top-0 z-20 -mx-4 flex min-h-[calc(4rem+max(1.25rem,env(safe-area-inset-top)))] shrink-0 items-end justify-between gap-4 px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-4 sm:-mx-6 sm:px-6 lg:hidden">
      {/* The blur sits on its own layer: a backdrop-filter on the header itself would make it the
          backdrop root and stop the glass menus inside from blurring the page behind them. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-background/80 backdrop-blur-xl" />
      <div className="grid min-w-0">
        {reduce ? (
          <Heading title={title} subtitle={chrome.subtitle} />
        ) : (
          <AnimatePresence initial={false}>
            <motion.div
              key={tab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={SWAP}
              className="col-start-1 row-start-1 min-w-0"
            >
              <Heading title={title} subtitle={chrome.subtitle} />
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      <div className="relative flex h-11 shrink-0 items-center justify-end gap-2">
        <HeaderActions
          action={chrome.action}
          checking={chrome.checking}
          refreshing={chrome.refreshing}
          onRefresh={() => run("onRefresh")}
          onDone={() => run("onDone")}
          onAdd={() => run("onAdd")}
        />
        <StreakChip />
        <AccountButton />
      </div>
    </header>
  );
}

function Heading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <>
      <h1 className="text-[34px] leading-none font-bold tracking-[-0.035em]">{title}</h1>
      <p className="mt-2 truncate text-[14px] leading-none text-muted">{subtitle}</p>
    </>
  );
}

function usePaneChrome() {
  const ctx = useContext(ChromeContext);
  if (!ctx) throw new Error("Pane chrome is missing");
  return ctx;
}

/** The button that is not shared across tabs. Desktop headers use this too. */
export function HeaderActions({
  action,
  checking,
  refreshing,
  onRefresh,
  onDone,
  onAdd,
}: {
  action: PaneAction;
  checking: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onDone: () => void;
  onAdd: () => void;
}) {
  const { copy } = useLocale();
  const reduce = useReducedMotion();
  const refreshIcon = useRef<{ startAnimation: () => void; stopAnimation: () => void }>(null);
  const addIcon = useRef<{ startAnimation: () => void; stopAnimation: () => void }>(null);
  const appear = reduce ? { opacity: 0 } : { opacity: 0, scale: 0.8 };
  // Leave faster than arriving, so the old button is gone before the new one settles.
  const gone = { ...appear, transition: { duration: 0.12, ease: [0.4, 0, 1, 1] as const } };

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      {action === "done" ? (
        <motion.button
          key="done"
          type="button"
          data-tour="header-done"
          onClick={() => {
            haptic("soft");
            onDone();
          }}
          initial={appear}
          animate={{ opacity: 1, scale: 1 }}
          exit={gone}
          layout="position"
          transition={SPRING.snap}
          whileTap={reduce ? undefined : { scale: 0.94 }}
          className="relative h-11 rounded-full bg-accent px-6 text-[15px] font-semibold text-accent-ink"
        >
          <HapticPad />
          {copy.done}
        </motion.button>
      ) : action === "refresh" ? (
        [
          <motion.button
            key="refresh"
            type="button"
            onClick={onRefresh}
            aria-label={copy.refresh}
            aria-busy={checking}
            onPointerEnter={() => refreshIcon.current?.startAnimation()}
            onPointerLeave={() => refreshIcon.current?.stopAnimation()}
            initial={appear}
            animate={{ opacity: 1, scale: 1 }}
            exit={gone}
            layout="position"
            transition={SPRING.snap}
            whileTap={reduce ? undefined : { scale: 0.92 }}
            className="relative grid size-11 place-items-center rounded-full bg-surface text-foreground"
          >
            <HapticPad />
            <span
              className="grid place-items-center"
              style={refreshing ? { animation: "spin 0.9s linear infinite" } : undefined}
            >
              <ArrowPathIcon ref={refreshIcon} size={20} aria-hidden />
            </span>
          </motion.button>,
          <motion.button
            key="add-crossing"
            type="button"
            aria-label={copy.addCrossing}
            data-tour="header-add"
            onClick={() => {
              haptic("light");
              onAdd();
            }}
            onPointerEnter={() => addIcon.current?.startAnimation()}
            onPointerLeave={() => addIcon.current?.stopAnimation()}
            initial={appear}
            animate={{ opacity: 1, scale: 1 }}
            exit={gone}
            layout="position"
            transition={SPRING.snap}
            whileTap={reduce ? undefined : { scale: 0.92 }}
            className="relative grid size-11 place-items-center rounded-full bg-accent text-accent-ink lg:hidden"
          >
            <HapticPad />
            <PlusIcon ref={addIcon} size={20} aria-hidden />
          </motion.button>,
        ]
      ) : action === "add" ? (
        <motion.button
          key="add"
          type="button"
          aria-label={copy.scheduleNew}
          data-tour="schedule-add"
          onClick={onAdd}
          initial={appear}
          animate={{ opacity: 1, scale: 1 }}
          exit={gone}
          layout="position"
          transition={SPRING.snap}
          whileTap={reduce ? undefined : { scale: 0.92 }}
          className="relative grid size-11 place-items-center rounded-full bg-accent text-accent-ink"
        >
          <HapticPad />
          <PlusIcon size={20} aria-hidden />
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}
