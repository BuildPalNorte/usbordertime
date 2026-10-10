import type { Transition } from "motion/react";

/**
 * Spring house style (Apple "damping / response" mapped to Motion's bounce + duration).
 * Default is critically damped. Bounce is reserved for motion that follows a gesture with momentum.
 */
export const SPRING = {
  /** Repositioning, expanding, reordering. No overshoot. */
  move: { type: "spring", bounce: 0, duration: 0.5 } satisfies Transition,
  /** Quick state changes (selection pills, chips). */
  snap: { type: "spring", bounce: 0, duration: 0.32 } satisfies Transition,
  /** After a flick or drag release. A little life, because momentum earned it. */
  release: { type: "spring", bounce: 0.18, duration: 0.5 } satisfies Transition,
  /** Small things that should feel springy: badges, check marks. */
  pop: { type: "spring", bounce: 0.35, duration: 0.45 } satisfies Transition,
};

export const REDUCED: Transition = { duration: 0.16, ease: "easeOut" };

/** Layout constants shared by the stack and its detail panel. */
export const CARD_H = 212;
export const PEEK = 76;

export function stackHeight(count: number): number {
  return count === 0 ? 0 : CARD_H + (count - 1) * PEEK;
}
