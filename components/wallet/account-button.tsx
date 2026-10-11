"use client";

import { useLocale } from "@/components/locale-provider";
import { authClient } from "@/lib/auth/client";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/cn";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { HapticPad } from "./haptic-pad";
import { SPRING } from "./motion";

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
    setBusy(false);
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

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5">
      <path
        fill="#4285F4"
        d="M23.04 12.26c0-.82-.07-1.6-.2-2.36H12v4.47h6.2a5.3 5.3 0 0 1-2.3 3.48v2.89h3.72c2.18-2 3.42-4.96 3.42-8.48Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.72-2.89c-1.07.72-2.44 1.15-4.22 1.15-3.24 0-5.99-2.19-6.97-5.13H1.2v2.98A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.03 14.22A7.2 7.2 0 0 1 4.65 12c0-.77.13-1.52.38-2.22V6.8H1.2A12 12 0 0 0 0 12c0 1.94.46 3.77 1.2 5.2l3.83-2.98Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.23 2.69 1.2 6.8l3.83 2.98c.98-2.94 3.73-5.01 6.97-5.01Z"
      />
    </svg>
  );
}
