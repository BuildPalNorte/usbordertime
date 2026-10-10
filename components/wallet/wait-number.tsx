"use client";

import { motion, useReducedMotion, useSpring, useTransform } from "motion/react";
import { useEffect } from "react";

/** A number that rolls to its new value instead of swapping. Driven by motion values, so no re-renders. */
export function WaitNumber({ value, className }: { value: number; className?: string }) {
  const reduce = useReducedMotion();
  const spring = useSpring(reduce ? value : 0, { stiffness: 150, damping: 22, mass: 0.9 });
  const text = useTransform(spring, (v) => Math.max(0, Math.round(v)).toString());

  useEffect(() => {
    if (reduce) spring.jump(value);
    else spring.set(value);
  }, [spring, value, reduce]);

  return (
    <motion.span className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {text}
    </motion.span>
  );
}
