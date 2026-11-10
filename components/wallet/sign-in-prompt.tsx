"use client";

import { useLocale } from "@/components/locale-provider";
import { authClient } from "@/lib/auth/client";
import { rememberCampaign } from "@/lib/campaign";
import { haptic } from "@/lib/haptics";
import { rememberInvite } from "@/lib/invite";
import { currentCallbackURL } from "@/lib/routes";
import { signInNudgeStore } from "@/lib/sign-in-nudge-store";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRef, useState, useSyncExternalStore } from "react";
import { useSignedIn } from "./account-context";
import { HapticPad } from "./haptic-pad";
import { InAppNotice, useInAppBrowser } from "./in-app-notice";
import { SPRING } from "./motion";
import { GoogleMark } from "./sign-in-screen";

/** Starts Google sign-in from a tap. Keeps the invite and campaign so the new account still gets them. */
export function useGoogleSignIn() {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const running = useRef(false);

  const signIn = async () => {
    if (running.current) return;
    running.current = true;
    haptic("selection");
    setBusy(true);
    setFailed(false);
    rememberInvite(window.location.search);
    rememberCampaign(window.location.search);
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: currentCallbackURL(),
      errorCallbackURL: `${window.location.pathname}?sign-in=failed`,
    });
    if (error) {
      running.current = false;
      setFailed(true);
      setBusy(false);
      haptic("error");
    }
  };

  return { signIn, busy, failed };
}

function GoogleButton({ className }: { className?: string }) {
  const { copy } = useLocale();
  const { signIn, busy, failed } = useGoogleSignIn();
  return (
    <>
      <button
        type="button"
        onClick={() => void signIn()}
        disabled={busy}
        aria-busy={busy}
        className={className ?? "sign-in-google"}
      >
        <HapticPad />
        <GoogleMark />
        {busy ? copy.signInRedirecting : copy.signInWithGoogle}
      </button>
      {failed && (
        <p role="status" className="mt-2 text-[13px] leading-snug text-danger">
          {copy.signInFailed}
        </p>
      )}
    </>
  );
}

/**
 * A quiet card above the bridges for someone using the app without an account. Signing in is a
 * suggestion, never a gate, and "Not now" holds it back for a few days.
 */
export function SignInNudge() {
  const { copy } = useLocale();
  const reduce = useReducedMotion();
  const signedIn = useSignedIn();
  const held = useSyncExternalStore(
    signInNudgeStore.subscribe,
    signInNudgeStore.getSnapshot,
    signInNudgeStore.getServerSnapshot,
  );
  const inApp = useInAppBrowser();
  const visible = !signedIn && !held;

  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.section
          key="signin-nudge"
          aria-label={copy.nudgeTitle}
          initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, height: "auto" }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
          transition={SPRING.snap}
          className="overflow-hidden"
        >
          <div className="mb-4 rounded-3xl bg-surface p-4">
            <p className="text-[15px] leading-tight font-semibold tracking-[-0.01em]">{copy.nudgeTitle}</p>
            <p className="mt-1 text-[13px] leading-snug text-muted">{copy.nudgeBody}</p>
            {inApp ? <InAppNotice browser={inApp} titleId="in-app-title-nudge" className="mt-3 text-left" /> : null}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <GoogleButton />
              <button
                type="button"
                onClick={() => {
                  haptic("light");
                  signInNudgeStore.dismiss();
                }}
                className="relative h-11 rounded-full px-4 text-[14px] font-medium text-muted active:opacity-60"
              >
                <HapticPad />
                {copy.nudgeDismiss}
              </button>
            </div>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}

/** Stands in for a feature that needs an account. The reason, and the one button that fixes it. */
export function SignInRequired({ title, body }: { title: string; body: string }) {
  const inApp = useInAppBrowser();
  return (
    <div className="rounded-3xl bg-surface p-6">
      <h3 className="text-[20px] font-bold tracking-[-0.02em]">{title}</h3>
      <p className="mt-1.5 text-[15px] leading-snug text-muted">{body}</p>
      {inApp ? <InAppNotice browser={inApp} titleId="in-app-title-required" className="mt-4 text-left" /> : null}
      <div className="mt-5 flex">
        <GoogleButton />
      </div>
    </div>
  );
}

/** The button inside an alert picker for someone without an account. */
export function SignInButton({ className }: { className?: string }) {
  return <GoogleButton className={className} />;
}
