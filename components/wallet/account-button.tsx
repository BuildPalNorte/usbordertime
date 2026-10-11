"use client";

import { useLocale } from "@/components/locale-provider";
import { authClient } from "@/lib/auth/client";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/cn";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { HapticPad } from "./haptic-pad";
import { SPRING } from "./motion";
import { GoogleMark } from "./sign-in-screen";

export function AccountButton({ className }: { className?: string }) {
  const { copy } = useLocale();
  const reduce = useReducedMotion();
  const { data: session, isPending } = authClient.useSession();
  // Session is read in the browser. The server render stays signed out so hydration matches.
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const user = mounted ? (session?.user ?? null) : null;
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("sign-in") !== "failed") return;
    setFailed(true);
    url.searchParams.delete("sign-in");
    const next = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState(window.history.state, "", next);
  }, []);

  useEffect(() => {
    if (!open && !failed) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      setFailed(false);
      buttonRef.current?.focus();
    };
    const onPointer = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
      setFailed(false);
    };
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, failed]);

  const signIn = async () => {
    if (busy) return;
    haptic("selection");
    setBusy(true);
    setFailed(false);
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/",
      errorCallbackURL: "/?sign-in=failed",
    });
    if (error) {
      setFailed(true);
      setBusy(false);
      haptic("error");
    }
  };

  const signOut = async () => {
    haptic("light");
    setOpen(false);
    setBusy(true);
    await authClient.signOut();
    window.location.assign("/");
  };

  const label = user ? copy.signedInAs(user.name || user.email) : copy.signInWithGoogle;
  const initial = (user?.name || user?.email || "?").trim().charAt(0).toUpperCase();
  const photo = user?.image && !imageFailed ? user.image : null;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <motion.button
        ref={buttonRef}
        type="button"
        onClick={() => {
          if (isPending || busy) return;
          if (user) {
            haptic("selection");
            setOpen((value) => !value);
            return;
          }
          void signIn();
        }}
        aria-label={label}
        aria-busy={mounted && (isPending || busy)}
        aria-expanded={user ? open : undefined}
        aria-haspopup={user ? "menu" : undefined}
        aria-controls={user && open ? menuId : undefined}
        disabled={mounted && (isPending || busy)}
        whileTap={reduce || (mounted && (isPending || busy)) ? undefined : { scale: 0.94 }}
        transition={SPRING.snap}
        className="relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-surface text-foreground disabled:opacity-70"
      >
        <HapticPad />
        {user ? (
          photo ? (
            // Google hosts the profile photo. next/image would need that host allowlisted.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo}
              alt=""
              referrerPolicy="no-referrer"
              onError={() => setImageFailed(true)}
              className="size-11 object-cover"
            />
          ) : (
            <span className="text-[15px] font-semibold">{initial}</span>
          )
        ) : (
          <GoogleMark />
        )}
      </motion.button>

      <AnimatePresence>
        {(open && user) || failed ? (
          <motion.div
            id={menuId}
            role={user && open ? "menu" : "status"}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.98 }}
            transition={SPRING.snap}
            className="glass absolute top-[calc(100%+0.5rem)] right-0 z-30 w-56 origin-top-right rounded-2xl p-1.5"
          >
            {failed && (
              <p className="px-3 py-2 text-[13px] leading-snug text-danger">{copy.signInFailed}</p>
            )}
            {user && open && (
              <>
                <p className="truncate px-3 pt-2 text-[14px] font-semibold">{user.name}</p>
                <p className="truncate px-3 pb-2 text-[12px] text-muted">{user.email}</p>
                <Link
                  href="/privacy"
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex h-10 w-full items-center rounded-xl px-3 text-left text-[14px] font-medium"
                >
                  {copy.privacyPolicy}
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => void signOut()}
                  className="relative flex h-10 w-full items-center rounded-xl px-3 text-left text-[14px] font-medium"
                >
                  <HapticPad />
                  {copy.signOut}
                </button>
              </>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

const emptySubscribe = () => () => {};
