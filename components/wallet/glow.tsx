"use client";

import type { Palette } from "@/lib/ports";
import { AnimatePresence, motion } from "motion/react";

/**
 * Ambient light that takes on the color of the open card, so the page feels lit by what you hold.
 * Cross-fades between palettes; plain radial gradients, no blur filter, so it stays cheap on phones.
 */
export function Glow({ palette }: { palette: Palette | null }) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <AnimatePresence>
        {palette && (
          <motion.div
            key={palette.id}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            style={{
              background: `radial-gradient(70rem 36rem at 50% -8rem, color-mix(in srgb, ${palette.from} 38%, transparent), transparent 70%)`,
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
