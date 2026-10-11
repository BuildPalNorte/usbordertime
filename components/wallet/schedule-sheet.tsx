"use client";

import { useLocale } from "@/components/locale-provider";
import type { PortWaitTime } from "@/lib/border-wait-times";
import { cn } from "@/lib/cn";
import { haptic } from "@/lib/haptics";
import { modeName, waitLabel } from "@/lib/i18n";
import { installStore } from "@/lib/install-store";
import { MODE_IDS, portName, readLane, TONE_DOT, type Mode } from "@/lib/ports";
import { enablePush, pushSupport, type PushSupport } from "@/lib/push-client";
import {
  ALL_DAYS,
  clockFace,
  clockMinute,
  clockParts,
  dayLabel,
  MAX_SCHEDULE_NAME,
  MAX_SCHEDULE_PORTS,
  sameDays,
  SCHEDULE_STEP,
  WEEKDAYS,
  type Schedule,
} from "@/lib/schedule";
import { CheckIcon } from "@heroicons-animated/react/check";
import { XMarkIcon } from "@heroicons-animated/react/x-mark";
import { animate, motion, useMotionTemplate, useMotionValue, useReducedMotion } from "motion/react";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { HapticPad } from "./haptic-pad";
import { SPRING } from "./motion";
import type { ScheduleSaveResult } from "./use-schedules";

type Problem = "denied" | "unsupported" | "install" | "failed" | "limit" | "missing" | "bridges";

const noopSubscribe = () => () => {};

function deviceZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

const STEPS = ["bridge", "time", "days"] as const;

type Props = {
  /** The schedule being edited, or null for a new one. */
  schedule: Schedule | null;
  /** The bridges to choose from: the saved wallet, plus any already on this schedule. */
  candidates: PortWaitTime[];
  /** The lane a new schedule starts on. */
  initialMode: Mode;
  onSave: (input: Omit<Schedule, "id"> & { id: string | null }) => Promise<ScheduleSaveResult>;
  onDelete: (id: string) => Promise<boolean>;
  onClose: () => void;
};

/** A bottom sheet on a phone, a centered card on a desktop. */
export function ScheduleSheet({
  schedule,
  candidates,
  initialMode,
  onSave,
  onDelete,
  onClose,
}: Props) {
  const { copy, locale } = useLocale();
  const reduce = useReducedMotion();
  const titleId = useId();
  const nameId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState(0);
  const [reached, setReached] = useState(schedule ? STEPS.length - 1 : 0);
  const [direction, setDirection] = useState(1);
  const [minute, setMinute] = useState(schedule?.minute ?? 7 * 60);
  const [name, setName] = useState(schedule?.name ?? "");
  const [days, setDays] = useState<number[]>(schedule ? schedule.days : [...WEEKDAYS]);
  const [mode, setMode] = useState<Mode>(schedule?.mode ?? initialMode);
  const [ports, setPorts] = useState<string[]>(schedule?.ports ?? []);
  const [busy, setBusy] = useState<"save" | "delete" | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);

  const zone = deviceZone();
  const support = useSyncExternalStore<PushSupport>(noopSubscribe, pushSupport, () => "ask");
  const blocked: Problem | null =
    support === "needs-install"
      ? "install"
      : support === "unsupported"
        ? "unsupported"
        : support === "denied"
          ? "denied"
          : null;
  const shown = problem ?? blocked;

  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: 0 });
  }, [step]);

  const titles = [copy.scheduleStepBridge, copy.scheduleStepTime, copy.scheduleStepDays];
  const stepLabels = [
    copy.scheduleStepBridgeLabel,
    copy.scheduleStepTimeLabel,
    copy.scheduleStepDaysLabel,
  ];
  const last = step === STEPS.length - 1;

  const go = (next: number) => {
    if (next === step || next < 0 || next >= STEPS.length) return;
    if (ports.length === 0 && next > 0) {
      haptic("error");
      setProblem("bridges");
      return;
    }
    haptic(next < step ? "light" : "selection");
    setDirection(next > step ? 1 : -1);
    setStep(next);
    setReached((current) => Math.max(current, next));
    setProblem(null);
  };

  // Only the lanes a candidate bridge actually publishes. The current one always stays.
  const lanes = MODE_IDS.filter(
    (id) => id === mode || candidates.some((port) => readLane(port, id).available),
  );
  const laneSample = candidates.find((port) => ports.includes(port.portNumber)) ?? candidates[0];
  const laneLabel = (id: Mode) =>
    laneSample ? modeName(id, laneSample, copy) : id === "sentri" ? "SENTRI" : copy.mode[id];

  const toggleDay = (day: number) => {
    haptic("selection");
    setProblem(null);
    setDays((current) => {
      if (!current.includes(day)) return [...current, day].sort((a, b) => a - b);
      // The last day stays on. A schedule with no days would never send.
      return current.length === 1 ? current : current.filter((item) => item !== day);
    });
  };

  const togglePort = (portNumber: string) => {
    haptic("selection");
    setProblem(null);
    setPorts((current) =>
      current.includes(portNumber)
        ? current.filter((item) => item !== portNumber)
        : current.length >= MAX_SCHEDULE_PORTS
          ? current
          : [...current, portNumber],
    );
  };

  const save = async () => {
    if (busy || blocked) return;
    if (ports.length === 0) {
      haptic("error");
      setProblem("bridges");
      return;
    }
    haptic("selection");
    setProblem(null);
    setBusy("save");

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

    const result = await onSave({
      id: schedule?.id ?? null,
      minute,
      days,
      timeZone: zone,
      mode,
      ports,
      name: name.trim() ? name : null,
      enabled: schedule?.enabled ?? true,
    });
    setBusy(null);
    if (result.status === "ok") {
      haptic("success");
      onClose();
    } else {
      haptic("error");
      setProblem(result.status);
    }
  };

  const remove = async () => {
    if (busy || !schedule) return;
    haptic("heavy");
    setProblem(null);
    setBusy("delete");
    const ok = await onDelete(schedule.id);
    setBusy(null);
    if (ok) onClose();
    else {
      haptic("error");
      setProblem("failed");
    }
  };

  const message: string | null =
    shown === "install"
      ? copy.alertNeedsInstall
      : shown === "denied"
        ? copy.alertDenied
        : shown === "unsupported"
          ? copy.alertUnsupported
          : shown === "limit"
            ? copy.scheduleLimit
            : shown === "missing"
              ? copy.scheduleMissing
              : shown === "bridges"
                ? copy.scheduleNoBridges
                : shown === "failed"
                  ? copy.scheduleFailed
                  : null;

  if (typeof document === "undefined") return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduce ? 0.12 : 0.22 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center sm:p-6"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        initial={reduce ? { opacity: 0 } : { y: "100%" }}
        animate={reduce ? { opacity: 1 } : { y: 0 }}
        exit={reduce ? { opacity: 0 } : { y: "100%" }}
        transition={reduce ? { duration: 0.12 } : SPRING.move}
        className="flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[28px] border border-line bg-background outline-none sm:rounded-[28px]"
        style={{ boxShadow: "inset 0 1px 0 var(--glass-highlight), 0 30px 80px -20px rgb(10 14 28 / 0.55)" }}
      >
        <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center gap-2 px-5 pt-5">
          {step > 0 ? (
            <button
              type="button"
              aria-label={copy.scheduleBack}
              onClick={() => go(step - 1)}
              className="relative grid size-10 place-items-center rounded-full bg-surface text-foreground active:scale-95"
            >
              <HapticPad />
              <ChevronLeft />
            </button>
          ) : (
            <span />
          )}
          <h2 id={titleId} className="truncate text-center text-[22px] font-bold tracking-[-0.03em]">
            {titles[step]}
          </h2>
          <button
            type="button"
            aria-label={copy.scheduleClose}
            onClick={() => {
              haptic("light");
              onClose();
            }}
            className="relative grid size-10 place-items-center justify-self-end rounded-full bg-surface text-foreground active:scale-95"
          >
            <HapticPad />
            <XMarkIcon size={18} aria-hidden />
          </button>
        </div>
        <p className="mt-1 text-center text-[13px] text-muted">
          {schedule ? copy.scheduleEditTitle : copy.scheduleNewTitle}
        </p>
        <div className="px-5 pt-4">
          <Label htmlFor={nameId}>{copy.scheduleName}</Label>
          <input
            id={nameId}
            type="text"
            enterKeyHint="done"
            autoComplete="off"
            autoCapitalize="words"
            maxLength={MAX_SCHEDULE_NAME}
            value={name}
            placeholder={copy.scheduleNamePlaceholder}
            onChange={(event) => {
              setName([...event.target.value].slice(0, MAX_SCHEDULE_NAME).join(""));
            }}
            className="mt-2 block h-12 w-full appearance-none rounded-2xl bg-surface px-4 text-[16px] text-foreground outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-accent"
          />
          <p className="mt-2 text-[12px] leading-snug text-muted">{copy.scheduleNameHint}</p>
        </div>
        <div className="mt-4 flex gap-3 px-5">
          {stepLabels.map((label, index) => {
            const open = index <= reached && (index === 0 || ports.length > 0);
            return (
              <button
                key={label}
                type="button"
                aria-current={index === step ? "step" : undefined}
                disabled={!open || index === step}
                onClick={() => go(index)}
                className="relative flex min-h-11 flex-1 flex-col justify-end gap-1.5 pb-1"
              >
                {open && index !== step && <HapticPad />}
                <span
                  className={cn(
                    "text-center text-[13px] leading-none transition-colors duration-200",
                    index === step
                      ? "font-semibold text-foreground"
                      : index <= reached
                        ? "font-medium text-foreground"
                        : "font-medium text-muted",
                  )}
                >
                  {label}
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "h-1 rounded-full transition-colors duration-200",
                    index <= reached ? "bg-accent" : "bg-foreground/12",
                  )}
                />
              </button>
            );
          })}
        </div>

        <div
          ref={scrollerRef}
          className="no-scrollbar min-h-64 flex-1 overflow-x-clip overflow-y-auto px-5 pt-4 pb-5"
        >
          <motion.div
            key={step}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: direction > 0 ? 12 : -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduce ? { duration: 0.12 } : SPRING.snap}
          >
            {step === 0 && (
              <div className="space-y-6">
                <section>
                  <div className="flex items-end justify-between gap-3">
                    <Label>{copy.scheduleBridges}</Label>
                    <span className="text-[12px] text-muted tabular-nums">
                      {copy.scheduleBridgesHint(ports.length, MAX_SCHEDULE_PORTS)}
                    </span>
                  </div>
                  <ul className="mt-2 space-y-1.5">
                    {candidates.map((port) => {
                      const on = ports.includes(port.portNumber);
                      const reading = readLane(port, mode);
                      const full = !on && ports.length >= MAX_SCHEDULE_PORTS;
                      const off = !on && (full || !reading.available);
                      return (
                        <li key={port.portNumber}>
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={on}
                            disabled={off}
                            onClick={() => togglePort(port.portNumber)}
                            className={cn(
                              "relative flex h-14 w-full items-center gap-3 rounded-2xl bg-surface px-4 text-left transition-[transform,opacity] duration-150 ease-out",
                              off ? "opacity-45" : "active:scale-[0.98]",
                            )}
                          >
                            {!off && <HapticPad />}
                            <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", TONE_DOT[reading.tone])} />
                            <span className="min-w-0 flex-1 truncate text-[15px] font-medium">
                              {portName(port).title}
                            </span>
                            <span className="shrink-0 text-[13px] text-muted tabular-nums">
                              {waitLabel(reading, copy)}
                            </span>
                            <span
                              aria-hidden
                              className={cn(
                                "grid size-6 shrink-0 place-items-center rounded-full border transition-colors duration-150",
                                on ? "border-transparent bg-accent text-accent-ink" : "border-foreground/20",
                              )}
                            >
                              {on && <CheckIcon size={14} aria-hidden />}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>

                <section>
                  <Label>{copy.scheduleLane}</Label>
                  <div role="radiogroup" aria-label={copy.scheduleLane} className="no-scrollbar -mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1 py-1">
                    {lanes.map((id) => {
                      const on = id === mode;
                      return (
                        <button
                          key={id}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          onClick={() => {
                            if (on) return;
                            haptic("selection");
                            setMode(id);
                          }}
                          className={cn(
                            "relative h-10 shrink-0 rounded-full px-4 text-[14px] font-medium transition-[transform,background-color,color] duration-150 ease-out active:scale-95",
                            on ? "bg-accent text-accent-ink" : "bg-surface text-foreground",
                          )}
                        >
                          <HapticPad />
                          {laneLabel(id)}
                        </button>
                      );
                    })}
                  </div>
                </section>
              </div>
            )}

            {step === 1 && (
              <section>
                <TimePicker
                  minute={minute}
                  onChange={(next) => {
                    setMinute(next);
                    setProblem(null);
                  }}
                />
                <p className="mt-4 text-center text-[12px] text-muted">{copy.scheduleZone(zone)}</p>
              </section>
            )}

            {step === 2 && (
              <section>
                <div className="flex justify-end gap-1">
                  <Preset
                    active={sameDays(days, WEEKDAYS)}
                    onClick={() => {
                      haptic("selection");
                      setDays([...WEEKDAYS]);
                    }}
                  >
                    {copy.scheduleWeekdays}
                  </Preset>
                  <Preset
                    active={sameDays(days, ALL_DAYS)}
                    onClick={() => {
                      haptic("selection");
                      setDays([...ALL_DAYS]);
                    }}
                  >
                    {copy.scheduleEveryDay}
                  </Preset>
                </div>
                <div role="group" aria-label={copy.scheduleDays} className="mt-3 grid grid-cols-7 gap-1.5">
                  {ALL_DAYS.map((day) => {
                    const on = days.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        aria-pressed={on}
                        aria-label={dayLabel(day, locale, "long")}
                        onClick={() => toggleDay(day)}
                        className={cn(
                          "relative aspect-square min-h-11 rounded-full text-[14px] font-semibold uppercase transition-[transform,background-color,color] duration-150 ease-out active:scale-90",
                          on ? "bg-accent text-accent-ink" : "bg-surface text-muted",
                        )}
                      >
                        <HapticPad />
                        {dayLabel(day, locale, "narrow")}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}
          </motion.div>
        </div>

        <div
          className="space-y-3 border-t border-line bg-background px-5 pt-3"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          {message && (
            <p
              role="alert"
              className={cn(
                "text-[13px] leading-snug",
                shown === "install" ? "text-muted" : "text-danger",
              )}
            >
              {message}
            </p>
          )}
          {shown === "install" && (
            <button
              type="button"
              onClick={() => {
                haptic("selection");
                onClose();
                void installStore.start();
              }}
              className="relative h-11 w-full rounded-full bg-surface text-[15px] font-semibold active:opacity-80"
            >
              <HapticPad />
              {copy.installMenu}
            </button>
          )}
          <div className="flex gap-2">
            {schedule && (
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void remove()}
                className="relative h-12 rounded-full bg-surface px-5 text-[15px] font-semibold text-danger active:opacity-70 disabled:opacity-50"
              >
                <HapticPad />
                {copy.scheduleDelete}
              </button>
            )}
            <button
              type="button"
              disabled={busy !== null || Boolean(blocked) || (step === 0 && ports.length === 0)}
              aria-busy={last && busy === "save"}
              onClick={() => {
                if (last) void save();
                else go(step + 1);
              }}
              className={cn(
                "relative h-12 flex-1 rounded-full bg-accent text-[16px] font-semibold text-accent-ink active:opacity-80 disabled:opacity-50",
                last && busy === "save" && !reduce && "animate-pulse",
              )}
            >
              <HapticPad />
              {last ? (busy === "save" ? copy.scheduleSaving : copy.scheduleSave) : copy.scheduleNext}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
const MINUTES = Array.from({ length: 60 / SCHEDULE_STEP }, (_, index) => index * SCHEDULE_STEP);

/** The clock is the control. A swipe rolls a digit; a tap opens its list. Minutes land on the 5-minute marks. */
function TimePicker({ minute, onChange }: { minute: number; onChange: (minute: number) => void }) {
  const { copy, locale } = useLocale();
  const face = clockFace(minute);
  const am = clockParts(0, locale).period ?? "AM";
  const pm = clockParts(12 * 60, locale).period ?? "PM";

  const pick = (next: number) => {
    if (next === minute) return;
    haptic("selection");
    onChange(next);
  };

  return (
    <div className="flex items-stretch justify-center gap-3">
      <div className="flex items-center">
        <TimeDigit
          label={copy.scheduleHour}
          value={face.hour}
          options={HOURS}
          format={(hour) => String(hour)}
          onSelect={(hour) => pick(clockMinute({ ...face, hour }))}
        />
        <span aria-hidden className="px-1 text-[56px] leading-none font-semibold tracking-[-0.045em] text-muted/70">
          :
        </span>
        <TimeDigit
          label={copy.scheduleMinute}
          value={face.minute}
          options={MINUTES}
          format={(value) => String(value).padStart(2, "0")}
          onSelect={(value) => pick(clockMinute({ ...face, minute: value }))}
        />
      </div>

      <div role="radiogroup" aria-label={copy.schedulePeriod} className="flex flex-col gap-1 rounded-[24px] bg-surface p-1.5">
          {[
            { pm: false, label: am },
            { pm: true, label: pm },
          ].map((option) => {
            const checked = face.pm === option.pm;
            return (
              <button
                key={option.label}
                type="button"
                role="radio"
                aria-checked={checked}
                tabIndex={checked ? 0 : -1}
                onClick={() => pick(clockMinute({ ...face, pm: option.pm }))}
                onKeyDown={(event) => {
                  if (event.repeat) return;
                  if (event.key !== "ArrowUp" && event.key !== "ArrowDown" && event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
                    return;
                  }
                  event.preventDefault();
                  pick(clockMinute({ ...face, pm: !face.pm }));
                  const buttons = event.currentTarget.parentElement?.querySelectorAll("button");
                  buttons?.[face.pm ? 0 : 1]?.focus();
                }}
                className={cn(
                  "relative min-h-12 min-w-16 flex-1 rounded-2xl px-3 text-[16px] font-semibold tracking-[-0.01em] whitespace-nowrap transition-[background-color,color,transform] duration-150 ease-out active:scale-95",
                  checked ? "bg-background text-foreground" : "text-muted",
                )}
              >
                <HapticPad />
                {option.label}
              </button>
            );
          })}
      </div>
    </div>
  );
}

const DIGIT_SLOP = 10;
/** A flick, in pixels per millisecond. Past this, a short swipe still rolls. */
const DIGIT_FLICK = 0.45;

function stepValue(options: readonly number[], value: number, direction: 1 | -1): number {
  const index = options.indexOf(value);
  if (index < 0) return options[0] ?? value;
  return options[(index + direction + options.length) % options.length] ?? value;
}

/**
 * One clock digit. A swipe rolls the next value in from that side. A tap opens the list.
 * The roll is the gesture itself, so a keyboard step changes the number in place.
 */
function TimeDigit({
  label,
  value,
  options,
  format,
  onSelect,
}: {
  label: string;
  value: number;
  options: readonly number[];
  format: (value: number) => string;
  onSelect: (value: number) => void;
}) {
  const reduce = useReducedMotion();
  const frameRef = useRef<HTMLSpanElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const drag = useMotionValue(0);
  const transform = useMotionTemplate`translateY(calc(-33.333% + ${drag}px))`;
  const running = useRef<ReturnType<typeof animate> | null>(null);
  const roll = useRef(0);
  const armed = useRef(false);
  const dragged = useRef(false);
  const heightRef = useRef(48);
  const gesture = useRef({ y: 0, origin: 0, lastY: 0, lastT: 0, velocity: 0 });

  const lower = stepValue(options, value, -1);
  const higher = stepValue(options, value, 1);

  useLayoutEffect(() => {
    if (!armed.current) return;
    armed.current = false;
    drag.jump(0);
  }, [value, drag]);

  useEffect(() => () => running.current?.stop(), []);

  const height = () => frameRef.current?.getBoundingClientRect().height || 48;

  const settle = (target: number, next: number | null) => {
    const id = ++roll.current;
    if (reduce) {
      drag.jump(0);
      if (next !== null) onSelect(next);
      return;
    }
    running.current?.stop();
    running.current = animate(drag, target, {
      ...SPRING.snap,
      onComplete: () => {
        if (id !== roll.current || next === null) return;
        armed.current = true;
        onSelect(next);
      },
    });
  };

  const openList = () => {
    const list = selectRef.current;
    if (!list) return;
    try {
      list.showPicker();
    } catch {
      list.focus();
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`${label}, ${format(value)}`}
        aria-haspopup="listbox"
        onKeyDown={(event) => {
          if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
          event.preventDefault();
          roll.current += 1;
          running.current?.stop();
          drag.jump(0);
          onSelect(event.key === "ArrowUp" ? higher : lower);
        }}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          roll.current += 1;
          running.current?.stop();
          heightRef.current = height();
          dragged.current = false;
          gesture.current = {
            y: event.clientY,
            origin: drag.get(),
            lastY: event.clientY,
            lastT: event.timeStamp,
            velocity: 0,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
          const state = gesture.current;
          const dy = event.clientY - state.y;
          if (!dragged.current && Math.abs(dy) < DIGIT_SLOP) return;
          dragged.current = true;
          const span = heightRef.current;
          drag.set(Math.max(-span, Math.min(span, state.origin + dy)));
          const dt = event.timeStamp - state.lastT;
          if (dt > 0) state.velocity = (event.clientY - state.lastY) / dt;
          state.lastY = event.clientY;
          state.lastT = event.timeStamp;
        }}
        onPointerUp={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
          if (!dragged.current) {
            if (drag.get() !== 0) settle(0, null);
            return;
          }
          const span = heightRef.current;
          const y = drag.get();
          const velocity = gesture.current.velocity;
          const up = y < -span * 0.4 || (velocity < -DIGIT_FLICK && y < 0);
          const down = y > span * 0.4 || (velocity > DIGIT_FLICK && y > 0);
          if (up) settle(-span, higher);
          else if (down) settle(span, lower);
          else settle(0, null);
        }}
        onPointerCancel={() => settle(0, null)}
        onClick={() => {
          if (dragged.current) {
            dragged.current = false;
            return;
          }
          openList();
        }}
        className="relative cursor-pointer touch-none rounded-[28px] bg-surface px-4 py-3 text-[72px] leading-none font-semibold tracking-[-0.045em] text-muted tabular-nums outline-none select-none transition-[background-color,color] duration-150 focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-accent active:bg-surface-strong active:text-foreground [@media(hover:hover)_and_(pointer:fine)]:hover:bg-surface-strong [@media(hover:hover)_and_(pointer:fine)]:hover:text-foreground"
      >
        <span ref={frameRef} className="block h-[1em] w-[2.2ch] overflow-hidden">
          <motion.span style={{ transform }} className="flex flex-col">
            <span className="block h-[1em] text-center">{format(lower)}</span>
            <span className="block h-[1em] text-center">{format(value)}</span>
            <span className="block h-[1em] text-center">{format(higher)}</span>
          </motion.span>
        </span>
      </button>
      <select
        ref={selectRef}
        tabIndex={-1}
        aria-hidden
        value={value}
        onChange={(event) => onSelect(Number(event.target.value))}
        className="pointer-events-none absolute inset-0 opacity-0"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {format(option)}
          </option>
        ))}
      </select>
    </div>
  );
}

function ChevronLeft() {
  return (
    <svg viewBox="0 0 20 20" className="size-[18px]" fill="none" aria-hidden>
      <path
        d="M12.25 4.75 7 10l5.25 5.25"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  const className = "text-[12px] font-semibold tracking-[0.06em] text-muted uppercase";
  if (htmlFor) {
    return (
      <label htmlFor={htmlFor} className={className}>
        {children}
      </label>
    );
  }
  return <p className={className}>{children}</p>;
}

function Preset({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "relative h-8 rounded-full px-3 text-[12px] font-medium transition-colors duration-150",
        active ? "bg-foreground/[0.12] text-foreground" : "text-muted active:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
