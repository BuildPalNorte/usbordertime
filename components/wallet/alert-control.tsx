"use client";

import { useLocale } from "@/components/locale-provider";
import { ALERT_PRESETS } from "@/lib/alert";
import type { PortWaitTime } from "@/lib/border-wait-times";
import { cn } from "@/lib/cn";
import { haptic } from "@/lib/haptics";
import { modeName } from "@/lib/i18n";
import { installStore } from "@/lib/install-store";
import type { Mode } from "@/lib/ports";
import { enablePush, pushEndpoint, pushSupport, type PushSupport } from "@/lib/push-client";
import { BellIcon, type BellIconHandle } from "@heroicons-animated/react/bell";
import { useReducedMotion } from "motion/react";
import { useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { HapticPad } from "./haptic-pad";
import { useAlerts } from "./use-alerts";

type Problem = "denied" | "unsupported" | "install" | "failed" | "test";

const noopSubscribe = () => () => {};

/**
 * "Tell me when this lane drops under N minutes." One alert per crossing and lane, kept with the
 * account. Choosing a wait asks the browser for notification permission, so it has to be a tap.
 */
export function AlertControl({ port, mode }: { port: PortWaitTime; mode: Mode }) {
  const { copy } = useLocale();
  const reduce = useReducedMotion();
  const bell = useRef<BellIconHandle>(null);
  const { find, set, clear } = useAlerts();
  const [busy, setBusy] = useState<number | "off" | null>(null);
  const [testing, setTesting] = useState(false);
  const [sent, setSent] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);

  const support = useSyncExternalStore<PushSupport>(noopSubscribe, pushSupport, () => "ask");

  const current = find(port.portNumber, mode);
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

  const turnOff = async () => {
    if (busy !== null || !current) return;
    haptic("selection");
    setProblem(null);
    setBusy("off");
    const ok = await clear(port.portNumber, mode);
    setBusy(null);
    if (ok) haptic("light");
    else {
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
    if (saved === "ok") haptic("success");
    else {
      haptic("error");
      setProblem("failed");
    }
  };

  const sendTest = async () => {
    if (busy !== null || testing || blocked) return;
    haptic("selection");
    setProblem(null);
    setSent(false);
    setTesting(true);

    const enabled = await enablePush();
    if (enabled !== "ok") {
      setTesting(false);
      haptic("error");
      setProblem(
        enabled === "denied"
          ? "denied"
          : enabled === "unsupported"
            ? "unsupported"
            : enabled === "needs-install"
              ? "install"
              : "test",
      );
      return;
    }

    try {
      const endpoint = await pushEndpoint();
      const response = await fetch("/api/alerts/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portNumber: port.portNumber, mode, endpoint }),
      });
      setTesting(false);
      if (response.ok) {
        haptic("success");
        setSent(true);
        return;
      }
    } catch {
      setTesting(false);
    }
    haptic("error");
    setProblem("test");
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
            : shown === "test"
              ? copy.alertTestFailed
              : sent
              ? copy.alertTestSent
              : current
              ? copy.alertHintOn(lane, current.threshold)
              : copy.alertHintOff;

  return (
    <div
      role="group"
      aria-label={copy.alertTitle}
      className="rounded-2xl bg-surface px-4 py-3.5"
      onPointerEnter={() => bell.current?.startAnimation()}
      onPointerLeave={() => bell.current?.stopAnimation()}
    >
      <div className="flex items-center gap-2 text-[14px] font-medium">
        <BellIcon ref={bell} size={18} aria-hidden className={current ? "text-accent" : "text-muted"} />
        <span>{copy.alertTitle}</span>
        <span className="text-muted">· {lane}</span>
      </div>

      <div role="radiogroup" aria-label={copy.alertGroup} className="mt-3 grid grid-cols-3 gap-2">
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
          shown === "failed" || shown === "test" || shown === "denied" ? "text-danger" : "text-muted",
        )}
      >
        {message}
      </p>

      {!blocked && (
        <button
          type="button"
          onClick={() => void sendTest()}
          disabled={testing || busy !== null}
          aria-busy={testing}
          className="relative mt-3 h-10 rounded-full bg-foreground/[0.07] px-5 text-[14px] font-medium active:scale-[0.98] disabled:opacity-50"
        >
          <HapticPad />
          {copy.alertTest}
        </button>
      )}

      {shown === "install" && (
        <button
          type="button"
          onClick={() => {
            haptic("selection");
            void installStore.start();
          }}
          className="relative mt-2 h-10 rounded-full bg-accent px-5 text-[14px] font-semibold text-accent-ink active:opacity-80"
        >
          <HapticPad />
          {copy.installMenu}
        </button>
      )}
    </div>
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
