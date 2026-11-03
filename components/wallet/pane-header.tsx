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
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { AccountButton } from "./account-button";
import { BrandLockup } from "./brand-lockup";
import { HapticPad } from "./haptic-pad";
import { SPRING } from "./motion";

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
 * Phone header. It stays mounted across tabs, so the brand, the streak, and the account
 * button never travel. The title and subtitle crossfade, because those words change.
 * The body below slides on its own.
 */
export function MobilePaneHeader({ tab, title }: { tab: string; title: string }) {
  const reduce = useReducedMotion();
  const { chrome, run } = usePaneChrome();
  const headerRef = useRef<HTMLElement>(null);
  const [lifted, setLifted] = useState(false);

  useEffect(() => {
    const scroller = headerRef.current?.parentElement;
    if (!scroller) return;
    const sync = () => {
      const next = scroller.scrollTop > 0;
      setLifted((current) => (current === next ? current : next));
    };
    sync();
    scroller.addEventListener("scroll", sync, { passive: true });
    return () => scroller.removeEventListener("scroll", sync);
  }, []);

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-20 -mx-4 flex shrink-0 flex-col gap-3 px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-4 sm:-mx-6 sm:px-6 lg:hidden"
    >
      {/* The blur sits on its own layer: a backdrop-filter on the header itself would make it the
          backdrop root and stop the glass menus inside from blurring the page behind them.
          The wash and the blur ease together, in either direction, and rest at nothing so the
          color behind the title shows through before you scroll. */}
      <div
        aria-hidden
        data-lifted={lifted ? "true" : undefined}
        className="header-scrim pointer-events-none absolute inset-0 -z-10"
      />
      <div className="flex items-center justify-between gap-3">
        <BrandLockup />
        <div className="flex shrink-0 items-center gap-2">
          <AccountButton />
        </div>
      </div>
      <div className="flex min-w-0 items-center justify-between gap-4">
        <div className="grid min-w-0">
          {reduce ? (
            <TitleWords title={title} subtitle={chrome.subtitle} />
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
                <TitleWords title={title} subtitle={chrome.subtitle} />
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        <TitleActions>
          <HeaderActions
            action={chrome.action}
            checking={chrome.checking}
            refreshing={chrome.refreshing}
            onRefresh={() => run("onRefresh")}
            onDone={() => run("onDone")}
            onAdd={() => run("onAdd")}
          />
        </TitleActions>
      </div>
    </header>
  );
}

/** Wide-window copy of the phone brand row. The wash appears only once the page scrolls under it. */
export function DesktopBrandBar() {
  const [lifted, setLifted] = useState(false);

  useEffect(() => {
    const sync = () => {
      const next = window.scrollY > 0;
      setLifted((current) => (current === next ? current : next));
    };
    sync();
    window.addEventListener("scroll", sync, { passive: true });
    return () => window.removeEventListener("scroll", sync);
  }, []);

  return (
    <header className="sticky top-0 z-30 -mx-4 -mt-[max(1.25rem,env(safe-area-inset-top))] mb-6 hidden items-center justify-between gap-4 px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-4 sm:-mx-6 sm:px-6 lg:flex">
      <div
        aria-hidden
        data-lifted={lifted ? "true" : undefined}
        className="header-scrim pointer-events-none absolute inset-0 -z-10"
      />
      <BrandLockup />
      <div className="flex shrink-0 items-center gap-2">
        <AccountButton />
      </div>
    </header>
  );
}

const titleClass = "truncate text-[34px] leading-none font-bold tracking-[-0.035em]";

/**
 * The page name and the line under it. The gap is tight so the status reads as part of the title.
 * The buttons center on both lines together.
 */
function TitleWords({
  title,
  subtitle,
  as = "h1",
}: {
  title: string;
  subtitle: string;
  as?: "h1" | "h2";
}) {
  const Title = as;
  return (
    <div className="min-w-0">
      <Title className={titleClass}>{title}</Title>
      <p className="mt-1 truncate text-[15px] leading-none text-muted">{subtitle}</p>
    </div>
  );
}

/** The page controls, held at 44px so a parent can center them on the title and the status. */
function TitleActions({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex h-11 shrink-0 items-center justify-end gap-2">{children}</div>
  );
}

/** Desktop copy of the phone's page title. The phone header owns the crossfade. */
export function PaneTitle({
  title,
  subtitle,
  as = "h2",
  children,
}: {
  title: string;
  subtitle: string;
  as?: "h1" | "h2";
  children?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-4">
      <TitleWords title={title} subtitle={subtitle} as={as} />
      {children ? <TitleActions>{children}</TitleActions> : null}
    </div>
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
