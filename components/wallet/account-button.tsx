"use client";

import { useLocale } from "@/components/locale-provider";
import { ArrowDownTrayIcon } from "@heroicons-animated/react/arrow-down-tray";
import { authClient } from "@/lib/auth/client";
import { haptic } from "@/lib/haptics";
import { installStore } from "@/lib/install-store";
import { rememberInvite } from "@/lib/invite";
import { nextMilestone, streakLevel } from "@/lib/streak";
import { signOutAndReload } from "@/lib/sign-out";
import {
  ADMIN_PATH,
  ASK_PATH,
  currentCallbackURL,
  EXPLORE_PATH,
  SCHEDULES_PATH,
} from "@/lib/routes";
import { QuestionMarkCircleIcon } from "@/components/wallet/question-mark-circle-icon";
import { ClockIcon } from "@heroicons-animated/react/clock";
import { MapIcon } from "@heroicons-animated/react/map";
import { tourSignal } from "@/lib/tour-signal";
import { SparklesIcon } from "@heroicons-animated/react/sparkles";
import { cn } from "@/lib/cn";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { HapticPad } from "./haptic-pad";
import { useInstall } from "./install-prompt";
import { LanguageSwitch } from "./language-switch";
import { SPRING } from "./motion";
import { GoogleMark } from "./sign-in-screen";
import { ThemeSwitch } from "./theme-switch";
import { useAdminAccess } from "./admin-access";
import { DevLocationReplay } from "./dev-location-replay";
import { DevStreakPicker } from "./dev-streak-picker";
import { LEVEL_COLOR, LevelIcon, useIconLoop } from "./streak-chip";
import { useStreak } from "./use-streak";

export function AccountButton({ className }: { className?: string }) {
  const { copy } = useLocale();
  const reduce = useReducedMotion();
  const install = useInstall();
  const { data: session, isPending } = authClient.useSession();
  // Session is read in the browser. The server render stays signed out so hydration matches.
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const user = mounted ? (session?.user ?? null) : null;
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const streak = useStreak();
  const level = streakLevel(streak?.current ?? 0);
  const levelColor = LEVEL_COLOR[level] ?? LEVEL_COLOR[0];
  const levelHandle = useIconLoop(level, open);
  const pathname = usePathname();
  const onSchedules = pathname === SCHEDULES_PATH;
  const onAsk = pathname === ASK_PATH;
  const admin = useAdminAccess();

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("sign-in") !== "failed") return;
    // The sign-in redirect lands with this query. It exists only in the browser, after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    rememberInvite(window.location.search);
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: currentCallbackURL(),
      errorCallbackURL: `${window.location.pathname}?sign-in=failed`,
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
    await signOutAndReload();
  };

  const label = user
    ? copy.signedInAs(user.name || user.email)
    : copy.signInWithGoogle;
  const initial = (user?.name || user?.email || "?")
    .trim()
    .charAt(0)
    .toUpperCase();
  const photo = user?.image && !imageFailed ? user.image : null;

  return (
    <div
      ref={rootRef}
      data-tour="account-button"
      className={cn("relative", className)}
    >
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
        whileTap={
          reduce || (mounted && (isPending || busy))
            ? undefined
            : { scale: 0.94 }
        }
        transition={SPRING.snap}
        className="relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-surface text-foreground disabled:opacity-70"
      >
        <HapticPad />
        {user ? (
          photo ? (
            // Served through the Next image proxy (lh3.googleusercontent.com is allowlisted),
            // so the browser sends no third-party cookies and gets a right-sized WebP.
            <Image
              src={photo}
              alt=""
              width={20}
              height={20}
              sizes="20px"
              referrerPolicy="no-referrer"
              onError={() => setImageFailed(true)}
              className="size-5 rounded-full object-cover"
            />
          ) : (
            <span className="flex size-5 items-center justify-center rounded-full bg-muted/40 text-[10px] font-semibold leading-none">
              {initial}
            </span>
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
            initial={
              reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.98 }}
            transition={SPRING.snap}
            className="glass absolute top-[calc(100%+0.5rem)] right-0 z-30 w-72 origin-top-right rounded-2xl p-1.5"
          >
            {failed && (
              <p className="px-3 py-2 text-[13px] leading-snug text-danger">
                {copy.signInFailed}
              </p>
            )}
            {user && open && (
              <>
                <p className="truncate px-3 pt-2 text-[14px] font-semibold">
                  {user.name}
                </p>
                <p className="truncate px-3 pb-2 text-[12px] text-muted">
                  {user.email}
                </p>
                {streak && streak.current > 0 && (
                  <div
                    className="mx-2 mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${levelColor} 14%, transparent)`,
                    }}
                  >
                    <span className="shrink-0" style={{ color: levelColor }}>
                      <LevelIcon size={24} level={level} handle={levelHandle} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[14px] leading-tight font-semibold">
                        {copy.streakDays(streak.current)}
                        <span
                          className="ml-1.5 text-[12px] font-semibold"
                          style={{ color: levelColor }}
                        >
                          {copy.streakLevels[level]}
                        </span>
                      </p>
                      <p className="truncate text-[12px] leading-tight text-muted">
                        {streak.current === 1
                          ? copy.streakStart
                          : copy.streakDetail(streak.longest, streak.totalDays)}
                      </p>
                      {streak.current > 1 &&
                        nextMilestone(streak.current) !== null && (
                          <p className="truncate text-[12px] leading-tight text-muted">
                            {copy.streakNext(
                              (nextMilestone(streak.current) ?? 0) -
                                streak.current,
                              nextMilestone(streak.current) ?? 0,
                            )}
                          </p>
                        )}
                    </div>
                  </div>
                )}
                {process.env.NODE_ENV === "development" && <DevStreakPicker />}
                {process.env.NODE_ENV === "development" && <DevLocationReplay />}
                {/* Phones have the tab bar. A desktop has no tab bar, so the menu is the way over. */}
                <Link
                  href={onSchedules ? EXPLORE_PATH : SCHEDULES_PATH}
                  role="menuitem"
                  onClick={() => {
                    haptic("selection");
                    setOpen(false);
                  }}
                  className="hidden h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-[14px] font-medium lg:flex"
                >
                  {onSchedules ? (
                    <MapIcon
                      size={20}
                      aria-hidden
                      className="shrink-0 [perspective:48px]"
                    />
                  ) : (
                    <ClockIcon size={20} aria-hidden className="shrink-0" />
                  )}
                  {onSchedules ? copy.browse : copy.schedules}
                </Link>
                <Link
                  href={onAsk ? EXPLORE_PATH : ASK_PATH}
                  role="menuitem"
                  onClick={() => {
                    haptic("selection");
                    setOpen(false);
                  }}
                  className="hidden h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-[14px] font-medium lg:flex"
                >
                  {onAsk ? (
                    <MapIcon
                      size={20}
                      aria-hidden
                      className="shrink-0 [perspective:48px]"
                    />
                  ) : (
                    <QuestionMarkCircleIcon
                      size={20}
                      aria-hidden
                      className="shrink-0"
                    />
                  )}
                  {onAsk ? copy.browse : copy.ask}
                </Link>
                <div
                  role="separator"
                  className="mx-2 my-1 h-px bg-foreground/10"
                />
                <LanguageSwitch variant="menu" />
                <ThemeSwitch variant="menu" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    haptic("light");
                    setOpen(false);
                    tourSignal.request();
                  }}
                  className="relative flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-[14px] font-medium"
                >
                  <HapticPad />
                  <SparklesIcon size={20} aria-hidden className="shrink-0" />
                  {copy.tourReplay}
                </button>
                {install.offerable && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      haptic("selection");
                      setOpen(false);
                      void installStore.start();
                    }}
                    className="relative flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-[14px] font-medium"
                  >
                    <HapticPad />
                    <ArrowDownTrayIcon
                      size={20}
                      aria-hidden
                      className="shrink-0"
                    />
                    {copy.installMenu}
                  </button>
                )}
                {admin && (
                  <Link
                    href={ADMIN_PATH}
                    role="menuitem"
                    onClick={() => {
                      haptic("selection");
                      setOpen(false);
                    }}
                    className="flex h-10 w-full items-center rounded-xl px-3 text-left text-[14px] font-medium"
                  >
                    {copy.admin}
                  </Link>
                )}
                <Link
                  href="/privacy"
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex h-10 w-full items-center rounded-xl px-3 text-left text-[14px] font-medium"
                >
                  {copy.privacyPolicy}
                </Link>
                <Link
                  href="/terms"
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex h-10 w-full items-center rounded-xl px-3 text-left text-[14px] font-medium"
                >
                  {copy.termsOfUse}
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
