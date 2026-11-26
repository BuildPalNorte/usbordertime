"use client";

import { useLocale } from "@/components/locale-provider";
import { SignInButton } from "@/components/wallet/sign-in-prompt";
import { REDUCED, SPRING } from "@/components/wallet/motion";
import { authClient } from "@/lib/auth/client";
import { haptic } from "@/lib/haptics";
import { packetStore } from "@/lib/tramites-packet-store";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

/**
 * Appears once the first two steps (you and your passport) are done: the moment the draft is worth keeping.
 * A suggestion, never a gate. Dismissing is remembered on this device.
 */
export function PacketSignInNudge({ earned, dismissed }: { earned: boolean; dismissed: boolean }) {
  const { copy } = useLocale();
  const p = copy.tramites.packet.nudge;
  const reduce = useReducedMotion();
  const { data: session, isPending } = authClient.useSession();
  const visible = earned && !dismissed && !isPending && !session;

  return (
    <AnimatePresence initial={false}>
      {visible ? (
        <motion.section
          key="packet-nudge"
          aria-label={p.title}
          initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, height: "auto" }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
          transition={reduce ? REDUCED : SPRING.snap}
          className="overflow-hidden"
        >
          <div className="mt-6 rounded-2xl bg-tfg/[0.05] p-4 ring-1 ring-tfg/12">
            <p className="text-[14px] font-medium text-tfg">{p.title}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-tfg/60">{p.body}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <SignInButton className="relative inline-flex h-11 items-center gap-2 rounded-full bg-tfg px-5 text-[14px] font-medium text-tpill transition-transform active:scale-[0.97] disabled:opacity-60" />
              <button
                type="button"
                onClick={() => {
                  haptic("light");
                  packetStore.dismissNudge();
                }}
                className="h-11 rounded-full px-4 text-[14px] text-tfg/60 transition-colors hover:text-tfg/85"
              >
                {p.dismiss}
              </button>
            </div>
          </div>
        </motion.section>
      ) : null}
    </AnimatePresence>
  );
}
