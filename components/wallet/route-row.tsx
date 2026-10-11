"use client";

import { useLocale } from "@/components/locale-provider";
import type { PortWaitTime } from "@/lib/border-wait-times";
import { waitLabel } from "@/lib/i18n";
import { portName, readLane, type Mode } from "@/lib/ports";
import { motion, useReducedMotion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { useLayoutEffect, useRef, type MouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import { CardFace } from "./card-face";
import type { StackItem } from "./card-stack";
import { REDUCED, SPRING } from "./motion";

const SLOP = 10;

/**
 * Publishes `routes` and `lane` from the URL. Isolated so the rest of the wallet
 * can prerender without waiting on the query string.
 */
export function RoutesFocusSync({ onKey }: { onKey: (key: string | null) => void }) {
  const params = useSearchParams();
  const routes = params.get("routes");
  const lane = params.get("lane");
  const key = routes && lane ? `${routes}\n${lane}` : null;
  useLayoutEffect(() => {
    onKey(key);
  }, [key, onKey]);
  return null;
}

/**
 * The bridges a notification named, in a row. Scrolls sideways when they don't fit.
 * Stays until the wallet dismisses it.
 */
export function RouteRow({
  items,
  label,
  checking = false,
  onOpen,
  onShare,
}: {
  items: StackItem[];
  label: string;
  checking?: boolean;
  onOpen: (portNumber: string) => void;
  onShare: (port: PortWaitTime, mode: Mode) => void;
}) {
  const { copy } = useLocale();
  const reduce = useReducedMotion();

  return (
    <div className="-mx-4 sm:-mx-6 lg:mx-0" style={{ containerType: "inline-size" }}>
      <ul
        aria-label={label}
        className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain scroll-px-4 px-4 pb-2 sm:scroll-px-6 sm:px-6 lg:scroll-px-0 lg:px-0"
      >
        {items.map((item, index) => {
          const id = item.port.portNumber;
          return (
            <motion.li
              key={id}
              className="w-[min(22rem,calc(100cqw-7.5rem))] shrink-0 snap-start"
              initial={reduce ? { opacity: 0 } : { opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...(reduce ? REDUCED : SPRING.move), delay: reduce ? 0 : index * 0.04 }}
            >
              <RouteCard
                item={item}
                label={cardLabel(item, copy)}
                checking={checking}
                onOpen={() => onOpen(id)}
                onShare={() => onShare(item.port, item.mode)}
              />
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}

function RouteCard({
  item,
  label,
  checking,
  onOpen,
  onShare,
}: {
  item: StackItem;
  label: string;
  checking: boolean;
  onOpen: () => void;
  onShare: () => void;
}) {
  const origin = useRef<{ x: number; y: number } | null>(null);

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    origin.current = { x: event.clientX, y: event.clientY };
  }

  function onClick(event: MouseEvent<HTMLDivElement>) {
    const target = event.target;
    if (target instanceof Element && target.closest("[data-card-action]")) return;
    const start = origin.current;
    if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > SLOP) return;
    onOpen();
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={label}
      onPointerDown={onPointerDown}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onOpen();
      }}
      className="cursor-pointer"
    >
      <CardFace port={item.port} mode={item.mode} checking={checking} onShare={onShare} />
    </div>
  );
}

function cardLabel(item: StackItem, copy: Parameters<typeof waitLabel>[1]): string {
  const reading = readLane(item.port, item.mode);
  const wait = reading.minutes !== null ? copy.minuteWait(reading.minutes) : waitLabel(reading, copy);
  return `${portName(item.port).title}, ${wait}`;
}
