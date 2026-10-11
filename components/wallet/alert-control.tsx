"use client";

import { useLocale } from "@/components/locale-provider";
import { ALERT_PRESETS } from "@/lib/alert";
import type { PortWaitTime } from "@/lib/border-wait-times";
import { cn } from "@/lib/cn";
import { haptic } from "@/lib/haptics";
import { modeName } from "@/lib/i18n";
import { installStore } from "@/lib/install-store";
import { readLane, type Mode } from "@/lib/ports";
import { enablePush, pushSupport, type PushSupport } from "@/lib/push-client";
import { ClockIcon, type ClockIconHandle } from "@heroicons-animated/react/clock";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { HapticPad } from "./haptic-pad";
import { SPRING } from "./motion";
import { useAlerts } from "./use-alerts";

type Problem = "denied" | "unsupported" | "install" | "failed";

const noopSubscribe = () => () => {};

type Place = { top: number; left: number; up: boolean };

/**
 * Clock on the card. A tap opens "tell me when this lane drops under N minutes."
 * One alert per crossing and lane, kept with the account. Choosing a wait asks for
 * notification permission, so that choice has to be the tap.
 */
export function AlertButton({
  port,
  mode,
  light,
}: {
  port: PortWaitTime;
  mode: Mode;
  light: boolean;
}) {
  const { copy } = useLocale();
  const reduce = useReducedMotion();
  const clock = useRef<ClockIconHandle>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dialogId = useId();
  const titleId = useId();
  const { find, set, clear } = useAlerts();
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState<Place | null>(null);
  const [busy, setBusy] = useState<number | "off" | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);

  const support = useSyncExternalStore<PushSupport>(noopSubscribe, pushSupport, () => "ask");

  const current = find(port.portNumber, mode);
  const reading = readLane(port, mode);
  const lane = modeName(mode, port, copy);
  const waits = [...new Set([...ALERT_PRESETS, ...(current ? [current.threshold] : [])])].sort(
    (a, b) => a - b,
  );

  const blocked: Problem | null =
    support === "needs-install"
      ? "install"
      : support === "unsupported"
        ? "unsupported"
        : support === "denied"
          ? "denied"
          : null;
  const shown = problem ?? blocked;

  useLayoutEffect(() => {
    if (!open) {
      setPlace(null);
      return;
    }
    const button = buttonRef.current;
    const panel = panelRef.current;
    if (!button || !panel) return;
    const anchor = button.getBoundingClientRect();
    const width = panel.offsetWidth;
    const height = panel.offsetHeight;
    const margin = 12;
    const gap = 8;
    let left = anchor.right - width;
    left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));
    const spaceBelow = window.innerHeight - anchor.bottom - gap;
    const spaceAbove = anchor.top - gap;
    const up = spaceBelow < height && spaceAbove > spaceBelow;
    const top = up
      ? Math.max(margin, anchor.top - gap - height)
      : Math.min(anchor.bottom + gap, window.innerHeight - height - margin);
    setPlace({ top, left, up });
  }, [open, shown, current, waits.length, busy]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      event.stopPropagation();
      event.preventDefault();
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Capture so the wallet's Escape (close the card, or leave the notification
      // row) sees this as already handled.
      event.preventDefault();
      setOpen(false);
    };
    // Opening focuses the dialog, which can nudge the scroller. Ignore that
    // before a real scroll should dismiss the picker.
    let armed = false;
    const arm = window.setTimeout(() => {
      armed = true;
    }, 300);
    const onScroll = () => {
      if (!armed) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer, true);
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.clearTimeout(arm);
      document.removeEventListener("pointerdown", onPointer, true);
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      clock.current?.stopAnimation();
      return;
    }
    clock.current?.startAnimation();
    if (!place) return;
    panelRef.current?.focus({ preventScroll: true });
  }, [open, place]);

  if (!reading.available && !current) return null;

  const turnOff = async () => {
    if (busy !== null || !current) return;
    haptic("selection");
    setProblem(null);
    setBusy("off");
    const ok = await clear(port.portNumber, mode);
    setBusy(null);
    if (ok) {
      haptic("light");
      setOpen(false);
    } else {
      haptic("error");
      setProblem("failed");
    }
  };

  const choose = async (threshold: number) => {
    if (busy !== null || blocked) return;
    if (current?.threshold === threshold) return;
    haptic("selection");
    setProblem(null);
    setBusy(threshold);

    // Permission first, straight from the tap. Browsers drop the prompt after any other await.
    const enabled = await enablePush();
    if (enabled !== "ok") {
      setBusy(null);
      haptic("error");
      setProblem(
        enabled === "denied"
          ? "denied"
          : enabled === "unsupported"
            ? "unsupported"
            : enabled === "needs-install"
              ? "install"
              : "failed",
      );
      return;
    }

    const saved = await set({ portNumber: port.portNumber, mode, threshold });
    setBusy(null);
    if (saved === "ok") {
      haptic("success");
      setOpen(false);
    } else {
      haptic("error");
      setProblem("failed");
    }
  };

  const message =
    shown === "install"
      ? copy.alertNeedsInstall
      : shown === "denied"
        ? copy.alertDenied
        : shown === "unsupported"
          ? copy.alertUnsupported
          : shown === "failed"
            ? copy.alertFailed
            : current
              ? copy.alertHintOn(lane, current.threshold)
              : copy.alertHintOff;

  const label = current ? copy.alertHintOn(lane, current.threshold) : copy.alertSchedule;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? dialogId : undefined}
        onClick={(event) => {
          event.stopPropagation();
          if (!open) haptic("selection");
          setProblem(null);
          setOpen((value) => !value);
        }}
        onPointerEnter={() => clock.current?.startAnimation()}
        onPointerLeave={() => {
          if (!open) clock.current?.stopAnimation();
        }}
        className={cn(
          "relative flex h-10 items-center justify-center rounded-full transition-transform active:scale-95",
          current ? "gap-1 px-2.5" : "w-10",
          light
            ? current
              ? "bg-white text-[#10131a]"
              : "bg-white/20 text-white"
            : current
              ? "bg-[#10131a] text-white"
              : "bg-black/10 text-[#10131a]",
        )}
      >
        <HapticPad />
        <ClockIcon ref={clock} size={18} aria-hidden />
        {current && (
          <span className="text-[13px] font-semibold tabular-nums">{current.threshold}</span>
        )}
      </button>

      {open &&
        createPortal(
            <motion.div
              key={place ? "placed" : "measure"}
              ref={panelRef}
              id={dialogId}
              role="dialog"
              tabIndex={-1}
              aria-labelledby={titleId}
              initial={
                !place || reduce ? false : { opacity: 0, y: place.up ? 8 : -8, scale: 0.96 }
              }
              animate={place ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0 }}
              transition={reduce ? { duration: 0.16 } : SPRING.snap}
              style={{
                top: place?.top ?? 0,
                left: place?.left ?? 0,
                visibility: place ? "visible" : "hidden",
                transformOrigin: place?.up ? "bottom right" : "top right",
              }}
              className="glass fixed z-50 w-[min(18rem,calc(100vw-1.5rem))] rounded-2xl p-3.5 outline-none"
            >
              <p id={titleId} className="text-[14px] font-medium">
                {copy.alertTitle}
                <span className="text-muted"> · {lane}</span>
              </p>
              <p className="mt-1 text-[12px] leading-snug text-muted">{copy.alertGroup}</p>

              <div role="radiogroup" aria-label={copy.alertGroup} className="mt-3 grid grid-cols-3 gap-1.5">
                <Chip
                  active={!current}
                  pending={busy === "off"}
                  disabled={!current || busy !== null}
                  reduce={Boolean(reduce)}
                  onClick={() => void turnOff()}
                >
                  {copy.alertOff}
                </Chip>
                {waits.map((wait) => (
                  <Chip
                    key={wait}
                    active={current?.threshold === wait}
                    pending={busy === wait}
                    disabled={Boolean(blocked) || busy !== null}
                    reduce={Boolean(reduce)}
                    onClick={() => void choose(wait)}
                  >
                    {copy.minutes(wait)}
                  </Chip>
                ))}
              </div>

              <p
                role={shown ? "alert" : "status"}
                className={cn(
                  "mt-3 text-[13px] leading-snug",
                  shown === "failed" || shown === "denied" ? "text-danger" : "text-muted",
                )}
              >
                {message}
              </p>

              {shown === "install" && (
                <button
                  type="button"
                  onClick={() => {
                    haptic("selection");
                    setOpen(false);
                    void installStore.start();
                  }}
                  className="relative mt-3 h-10 w-full rounded-full bg-accent text-[14px] font-semibold text-accent-ink active:opacity-80"
                >
                  <HapticPad />
                  {copy.installMenu}
                </button>
              )}
            </motion.div>,
          document.body,
        )}
    </>
  );
}

function Chip({
  active,
  pending,
  disabled,
  reduce,
  onClick,
  children,
}: {
  active: boolean;
  pending: boolean;
  disabled: boolean;
  reduce: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      aria-busy={pending}
      disabled={disabled && !active}
      onClick={onClick}
      className={cn(
        "relative h-10 rounded-xl text-[14px] font-medium tabular-nums transition-[transform,opacity,background-color] duration-150 ease-out",
        active ? "bg-accent text-accent-ink" : "bg-foreground/[0.07] text-foreground",
        pending && (reduce ? "opacity-60" : "animate-pulse"),
        disabled && !active ? "opacity-40" : "active:scale-[0.97]",
      )}
    >
      <HapticPad />
      {children}
    </button>
  );
}
