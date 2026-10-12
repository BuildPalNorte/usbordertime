"use client";

import { useLocale } from "@/components/locale-provider";
import type { PortWaitTime } from "@/lib/border-wait-times";
import type { Mode } from "@/lib/ports";
import { AccountButton } from "./account-button";
import { StreakChip } from "./streak-chip";
import { PlusIcon } from "@heroicons-animated/react/plus";
import { motion, useReducedMotion } from "motion/react";
import { forwardRef, useRef, useState } from "react";
import { HeaderActions, usePublishPaneChrome, type PaneAction } from "./pane-header";
import { CardStack, type StackItem } from "./card-stack";
import { RouteRow } from "./route-row";
import { HapticPad } from "./haptic-pad";
import { InstallBanner } from "./install-prompt";
import { CARD_H, PEEK, SPRING } from "./motion";

type Props = {
  items: StackItem[];
  hydrated: boolean;
  loading: boolean;
  refreshing: boolean;
  checking: boolean;
  updatedAt: string | null;
  expandedId: string | null;
  suggested: PortWaitTime[];
  onExpand: (portNumber: string) => void;
  onCollapse: () => void;
  onMode: (portNumber: string, mode: Mode) => void;
  cityPinned: boolean;
  onPinCity: () => void;
  onShare: (port: PortWaitTime, mode: Mode) => void;
  onRemove: (portNumber: string) => void;
  onReorder: (portNumber: string, toIndex: number) => void;
  onRefresh: () => void;
  onBrowse: () => void;
  onAddSuggested: () => void;
  /** Bridges from a notification, full cards one above the other. Null when that view is closed. */
  routes: StackItem[] | null;
  routesLabel: string | null;
  routesMissing: boolean;
  onDismissRoutes: () => void;
  /** This tab owns the phone header, which stays put while the body slides. */
  ownsHeader: boolean;
};

export const WalletPane = forwardRef<HTMLElement, Props>(function WalletPane(props, headerRef) {
  const {
    items,
    hydrated,
    loading,
    refreshing,
    checking,
    updatedAt,
    expandedId,
    suggested,
    onCollapse,
    onRefresh,
    onBrowse,
    onAddSuggested,
    routes,
    routesLabel,
    routesMissing,
    onDismissRoutes,
    ownsHeader,
  } = props;
  const { copy } = useLocale();
  const open = expandedId !== null && items.some((i) => i.port.portNumber === expandedId);
  const holding = routes !== null || routesMissing;
  // Once the notification row has been on screen, the stack should return in place.
  const [seenRoutes, setSeenRoutes] = useState(false);
  if (holding && !seenRoutes) setSeenRoutes(true);
  // Remember the order on screen, so the stack can take each card from where it sat.
  const [rowIds, setRowIds] = useState<string[] | null>(null);
  const shownIds = routes ? routes.map((item) => item.port.portNumber) : null;
  if (shownIds && (!rowIds || rowIds.join() !== shownIds.join())) setRowIds(shownIds);

  const subtitle = routesLabel
    ? routesLabel
    : !hydrated
      ? "\u00A0"
      : items.length === 0
        ? copy.nothingSaved
        : copy.savedSummary(items.length, updatedAt);
  const action: PaneAction = open || holding ? "done" : "refresh";

  usePublishPaneChrome(ownsHeader, { subtitle, action, checking, refreshing }, {
    onRefresh,
    onDone: () => {
      if (open) onCollapse();
      else onDismissRoutes();
    },
    onAdd: onBrowse,
  });

  return (
    <div>
      <header ref={headerRef} className="hidden min-h-[4.5rem] items-end justify-between gap-4 pb-5 lg:flex">
        <div className="min-w-0">
          <h1 className="text-[34px] leading-none font-bold tracking-[-0.035em]">{copy.wallet}</h1>
          <p className="mt-2 truncate text-[14px] leading-none text-muted">{subtitle}</p>
        </div>

        <div className="relative flex h-11 items-center justify-end gap-2">
          <HeaderActions
            action={action}
            checking={checking}
            refreshing={refreshing}
            onRefresh={onRefresh}
            onDone={() => {
              if (open) onCollapse();
              else onDismissRoutes();
            }}
            onAdd={onBrowse}
          />
          <StreakChip />
          <AccountButton />
        </div>
      </header>

      <div className="pane-body">
      {!open && !holding && <InstallBanner />}

      {!hydrated || loading ? (
        <StackSkeleton />
      ) : routes ? (
        <RouteRow
          items={routes}
          label={routesLabel ?? copy.routesLead}
          checking={checking}
          onOpen={props.onExpand}
          onShare={props.onShare}
        />
      ) : routesMissing ? (
        <p className="max-w-[28ch] pt-6 text-[17px] leading-snug font-medium tracking-[-0.02em]">
          {copy.routesMissing}
        </p>
      ) : items.length === 0 ? (
        <EmptyWallet suggested={suggested} onBrowse={onBrowse} onAddSuggested={onAddSuggested} />
      ) : (
        <CardStack
          items={items}
          expandedId={props.expandedId}
          cityPinned={props.cityPinned}
          onExpand={props.onExpand}
          onCollapse={props.onCollapse}
          onMode={props.onMode}
          onPinCity={props.onPinCity}
          onShare={props.onShare}
          onRemove={props.onRemove}
          onReorder={props.onReorder}
          checking={checking}
          quiet={seenRoutes}
          returnFrom={seenRoutes ? rowIds : null}
        />
      )}
      </div>
    </div>
  );
});

function StackSkeleton() {
  return (
    <div aria-hidden className="relative" style={{ height: CARD_H + PEEK * 2 }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="shimmer absolute inset-x-0 top-0 rounded-3xl"
          style={{ height: CARD_H, transform: `translateY(${i * PEEK}px)`, zIndex: i }}
        />
      ))}
    </div>
  );
}

function EmptyWallet({
  suggested,
  onBrowse,
  onAddSuggested,
}: {
  suggested: PortWaitTime[];
  onBrowse: () => void;
  onAddSuggested: () => void;
}) {
  const { copy } = useLocale();
  const reduce = useReducedMotion();
  const plus = useRef<{ startAnimation: () => void; stopAnimation: () => void }>(null);

  return (
    <div className="pt-2">
      <div className="relative mx-auto" style={{ height: CARD_H * 0.62 + 40 }}>
        {[2, 1, 0].map((layer) => (
          <motion.div
            key={layer}
            aria-hidden
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 40 }}
            animate={{ opacity: 1 - layer * 0.28, y: layer * -14, scale: 1 - layer * 0.05 }}
            transition={{ ...SPRING.move, delay: (2 - layer) * 0.07 }}
            className="absolute inset-x-0 bottom-0 rounded-3xl border border-dashed border-foreground/20 bg-surface/60"
            style={{ height: CARD_H * 0.62, transformOrigin: "50% 100%" }}
          />
        ))}
      </div>

      <div className="mt-8 text-center">
        <h2 className="text-[22px] leading-tight font-semibold tracking-[-0.025em]">
          {copy.emptyTitle}
        </h2>
        <p className="mx-auto mt-2 max-w-[32ch] text-[15px] leading-relaxed text-muted">
          {copy.emptyBody}
        </p>
      </div>

      <div className="mt-6 flex flex-col items-center gap-3">
        <motion.button
          type="button"
          onClick={onBrowse}
          onPointerEnter={() => plus.current?.startAnimation()}
          onPointerLeave={() => plus.current?.stopAnimation()}
          whileTap={reduce ? undefined : { scale: 0.96 }}
          transition={SPRING.snap}
          className="relative inline-flex h-12 items-center gap-2 rounded-full bg-accent px-6 text-[16px] font-semibold text-accent-ink"
        >
          <HapticPad />
          <PlusIcon ref={plus} size={20} aria-hidden />
          {copy.browseCrossings}
        </motion.button>
        {suggested.length > 0 && (
          <button
            type="button"
            onClick={onAddSuggested}
            className="relative h-11 rounded-full px-4 text-[15px] font-medium text-accent transition-opacity active:opacity-60"
          >
            <HapticPad />
            {copy.startWithBrownsville}
          </button>
        )}
      </div>
    </div>
  );
}
