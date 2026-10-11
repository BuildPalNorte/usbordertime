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
  const key = routes ? `${routes}\n${params.get("lane") ?? ""}` : null;
  useLayoutEffect(() => {
    onKey(key);
  }, [key, onKey]);
  return null;
}

/**
 * The bridges a notification named, each one a full card, one above the other.
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
    <ul aria-label={label} className="flex flex-col gap-3">
      {items.map((item, index) => {
        const id = item.port.portNumber;
        return (
          <motion.li
            key={id}
            className="w-full"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
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
