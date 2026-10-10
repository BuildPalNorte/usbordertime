"use client";

import type { PortWaitTime } from "@/lib/border-wait-times";
import { portName, project, readLane, type Mode } from "@/lib/ports";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type PanInfo,
} from "motion/react";
import { useEffect, useState, type KeyboardEvent } from "react";
import { CardDetail } from "./card-detail";
import { CardFace } from "./card-face";
import { CARD_H, PEEK, REDUCED, SPRING, stackHeight } from "./motion";

export type StackItem = { port: PortWaitTime; mode: Mode };

type Props = {
  items: StackItem[];
  expandedId: string | null;
  onExpand: (portNumber: string) => void;
  onCollapse: () => void;
  onMode: (portNumber: string, mode: Mode) => void;
  onRemove: (portNumber: string) => void;
};

/** How far a drag must be projected to dismiss the open card. */
const DISMISS_DISTANCE = 120;

export function CardStack({ items, expandedId, onExpand, onCollapse, onMode, onRemove }: Props) {
  const reduce = useReducedMotion();
  const height = stackHeight(items.length);
  const open = items.find((item) => item.port.portNumber === expandedId) ?? null;
  const anyOpen = open !== null;

  // Cards fan in once on first paint; after that, changes are immediate springs.
  const [intro, setIntro] = useState(true);
  useEffect(() => {
    const id = window.setTimeout(() => setIntro(false), 900);
    return () => window.clearTimeout(id);
  }, []);

  // The open card follows the finger 1:1; the detail below reacts to the same value.
  const dragY = useMotionValue(0);
  const detailOpacity = useTransform(dragY, [0, 240], [1, 0.2]);
  const detailY = useTransform(dragY, [0, 240], [0, 48]);

  function handleDragEnd(_: unknown, info: PanInfo) {
    const projected = info.offset.y + project(info.velocity.y);
    if (projected > DISMISS_DISTANCE) onCollapse();
  }

  const spring = reduce ? REDUCED : SPRING.move;

  return (
    <div className="relative" style={{ minHeight: height }}>
      <AnimatePresence initial>
        {items.map((item, index) => {
          const id = item.port.portNumber;
          const isOpen = id === expandedId;
          const dimmed = anyOpen && !isOpen;
          const restY = index * PEEK;
          const y = isOpen ? 0 : dimmed ? CARD_H + 72 : restY;

          return (
            <motion.div
              key={id}
              className="absolute inset-x-0 top-0"
              style={{
                zIndex: isOpen ? items.length + 1 : index + 1,
                pointerEvents: dimmed ? "none" : "auto",
              }}
              initial={reduce ? { opacity: 0 } : { y: height + 120, opacity: 0, scale: 0.94 }}
              animate={{
                y,
                opacity: dimmed ? 0 : 1,
                scale: dimmed ? 0.95 : 1,
              }}
              exit={
                reduce
                  ? { opacity: 0 }
                  : { y: restY + 160, opacity: 0, scale: 0.92, transition: SPRING.move }
              }
              transition={{
                ...spring,
                // Fan in on first paint; when closing, return in stack order.
                delay: reduce ? 0 : intro ? index * 0.06 : dimmed ? 0 : 0.02 * index,
              }}
            >
              <motion.div
                role="button"
                tabIndex={isOpen ? -1 : 0}
                aria-label={ariaLabel(item)}
                aria-expanded={isOpen}
                onTap={isOpen ? undefined : () => onExpand(id)}
                onKeyDown={(event: KeyboardEvent) => {
                  if (!isOpen && (event.key === "Enter" || event.key === " ")) {
                    event.preventDefault();
                    onExpand(id);
                  }
                }}
                // Feedback on pointer-down, not on release.
                whileTap={isOpen || reduce ? undefined : { scale: 0.985 }}
                transition={SPRING.snap}
                drag={isOpen && !reduce ? "y" : false}
                dragConstraints={{ top: 0, bottom: 0 }}
                // Rubber-band: almost no give upward, generous give downward.
                dragElastic={{ top: 0.04, bottom: 0.6 }}
                dragSnapToOrigin
                dragTransition={{ bounceStiffness: 420, bounceDamping: 34 }}
                onDragEnd={handleDragEnd}
                style={isOpen ? { y: dragY, cursor: "grab" } : { cursor: "pointer" }}
                whileDrag={{ cursor: "grabbing" }}
              >
                <CardFace port={item.port} mode={item.mode} />
              </motion.div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            key="detail"
            style={{ opacity: detailOpacity, y: detailY, paddingTop: CARD_H + 20 }}
          >
            <motion.div
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12, transition: { duration: 0.14 } }}
              transition={{ ...spring, delay: reduce ? 0 : 0.08 }}
            >
              <CardDetail
                port={open.port}
                mode={open.mode}
                onMode={(mode) => onMode(open.port.portNumber, mode)}
                onRemove={() => onRemove(open.port.portNumber)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ariaLabel(item: StackItem): string {
  const reading = readLane(item.port, item.mode);
  const wait = reading.minutes !== null ? `${reading.minutes} minute wait` : reading.statusText;
  return `${portName(item.port).title}, ${wait}`;
}
