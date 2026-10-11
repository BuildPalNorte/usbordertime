"use client";

import { useLocale } from "@/components/locale-provider";
import type { PortWaitTime } from "@/lib/border-wait-times";
import { cn } from "@/lib/cn";
import { haptic } from "@/lib/haptics";
import { modeName, waitLabel } from "@/lib/i18n";
import { portName, readLane, TONE_DOT, type Mode } from "@/lib/ports";
import { enablePush, pushEndpoint } from "@/lib/push-client";
import {
  ALL_DAYS,
  clockParts,
  dayLabel,
  MAX_SCHEDULE_PORTS,
  MAX_SCHEDULES,
  sameDays,
  WEEKDAYS,
  type Schedule,
} from "@/lib/schedule";
import { PlusIcon } from "@heroicons-animated/react/plus";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { HeaderActions, usePublishPaneChrome, type PaneAction } from "./pane-header";
import { HapticPad } from "./haptic-pad";
import { REDUCED, SPRING } from "./motion";
import { ScheduleSheet } from "./schedule-sheet";
import type { StackItem } from "./card-stack";
import { useSchedules } from "./use-schedules";

type Props = {
  ports: PortWaitTime[];
  /** The saved wallet, in stack order. Schedules report on these bridges. */
  items: StackItem[];
  hydrated: boolean;
  onBrowse: () => void;
  /** This tab owns the phone header, which stays put while the body slides. */
  ownsHeader: boolean;
};

type Editing = { schedule: Schedule | null } | null;

export function SchedulesPane({ ports, items, hydrated, onBrowse, ownsHeader }: Props) {
  const { copy } = useLocale();
  const { schedules, loading, failed, refetch, save, remove } = useSchedules();
  const [editing, setEditing] = useState<Editing>(null);

  const byNumber = useMemo(() => new Map(ports.map((port) => [port.portNumber, port])), [ports]);
  const count = schedules?.length ?? 0;
  const full = count >= MAX_SCHEDULES;
  const noBridges = hydrated && items.length === 0;

  // The bridges you can pick: your wallet, plus any this schedule already names.
  const candidates = useMemo(() => {
    const list = items.map((item) => item.port);
    for (const number of editing?.schedule?.ports ?? []) {
      const port = byNumber.get(number);
      if (port && !list.some((item) => item.portNumber === number)) list.push(port);
    }
    return list;
  }, [items, editing, byNumber]);

  const first = items[0];
  const startMode: Mode = first?.mode ?? "car";
  const sample = useMemo(() => {
    const schedule = (schedules ?? []).find((item) => item.ports.length > 0);
    if (schedule) {
      return { ports: schedule.ports.slice(0, MAX_SCHEDULE_PORTS), mode: schedule.mode };
    }
    const picked = items.slice(0, MAX_SCHEDULE_PORTS);
    const mode = picked[0]?.mode;
    if (!mode || picked.length === 0) return null;
    return { ports: picked.map((item) => item.port.portNumber), mode };
  }, [schedules, items]);
  const showTest = process.env.NODE_ENV === "development" && sample !== null;

  const open = (schedule: Schedule | null) => {
    haptic("selection");
    setEditing({ schedule });
  };

  const subtitle = !hydrated || loading ? "\u00A0" : copy.schedulesSummary(count);
  const action: PaneAction = !noBridges && !full && count > 0 ? "add" : "none";

  usePublishPaneChrome(
    ownsHeader,
    { subtitle, action, checking: false, refreshing: false },
    { onRefresh: () => {}, onDone: () => {}, onAdd: () => open(null) },
  );

  return (
    <div>
      <header className="hidden min-h-[4.5rem] items-end justify-between gap-4 pb-5 lg:flex">
        <div className="min-w-0">
          <h2 className="text-[34px] leading-none font-bold tracking-[-0.035em]">{copy.schedules}</h2>
          <p className="mt-2 truncate text-[14px] leading-none text-muted">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <HeaderActions
            action={action}
            checking={false}
            refreshing={false}
            onRefresh={() => {}}
            onDone={() => {}}
            onAdd={() => open(null)}
          />
        </div>
      </header>

      <div className="pane-body">

      {!hydrated || loading ? (
        <ListSkeleton />
      ) : failed ? (
        <div className="rounded-3xl bg-surface p-6 text-center">
          <p className="text-[15px] text-muted">{copy.loadErrorBody}</p>
          <button
            type="button"
            onClick={() => {
              haptic("light");
              void refetch();
            }}
            className="relative mt-4 h-11 rounded-full bg-accent px-6 text-[15px] font-semibold text-accent-ink active:opacity-80"
          >
            <HapticPad />
            {copy.tryAgain}
          </button>
        </div>
      ) : noBridges && count === 0 ? (
        <Empty
          body={copy.scheduleNeedBridge}
          action={copy.browseCrossings}
          onAction={() => {
            haptic("selection");
            onBrowse();
          }}
        />
      ) : count === 0 ? (
        <Empty body={copy.scheduleEmptyBody} action={copy.scheduleNew} onAction={() => open(null)}>
          {showTest && sample && <ScheduleTest ports={sample.ports} mode={sample.mode} />}
        </Empty>
      ) : (
        <>
          <ul className="space-y-3">
            {(schedules ?? []).map((schedule, index) => (
              <li key={schedule.id} className="rise" style={{ "--i": index } as CSSProperties}>
                <ScheduleCard
                  schedule={schedule}
                  byNumber={byNumber}
                  onOpen={() => open(schedule)}
                  onToggle={async () => {
                    haptic("selection");
                    const result = await save({ ...schedule, enabled: !schedule.enabled });
                    if (result.status !== "ok") haptic("error");
                  }}
                />
              </li>
            ))}
          </ul>
          {showTest && sample && <ScheduleTest ports={sample.ports} mode={sample.mode} />}
        </>
      )}
      </div>

      <AnimatePresence>
        {editing && (
          <ScheduleSheet
            key={editing.schedule?.id ?? "new"}
            schedule={editing.schedule}
            candidates={candidates}
            initialMode={startMode}
            onSave={save}
            onDelete={remove}
            onClose={() => setEditing(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ScheduleCard({
  schedule,
  byNumber,
  onOpen,
  onToggle,
}: {
  schedule: Schedule;
  byNumber: Map<string, PortWaitTime>;
  onOpen: () => void;
  onToggle: () => void;
}) {
  const { copy, locale } = useLocale();
  const clock = clockParts(schedule.minute, locale);
  const bridges = schedule.ports.flatMap((number) => byNumber.get(number) ?? []);
  const lane = bridges[0]
    ? modeName(schedule.mode, bridges[0], copy)
    : schedule.mode === "sentri"
      ? "SENTRI"
      : copy.mode[schedule.mode];
  const time = clock.period ? `${clock.digits} ${clock.period}` : clock.digits;
  const daily = sameDays(schedule.days, ALL_DAYS);
  const weekdays = sameDays(schedule.days, WEEKDAYS);

  return (
    <div
      className={cn(
        "relative rounded-3xl bg-surface transition-opacity duration-200",
        !schedule.enabled && "opacity-60",
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={schedule.name ? `${schedule.name}, ${time}, ${lane}` : `${time}, ${lane}`}
        className="relative block w-full rounded-3xl p-5 pr-20 text-left transition-transform duration-150 ease-out active:scale-[0.985]"
      >
        <HapticPad />
        {schedule.name && (
          <span className="mb-2 block truncate text-[17px] font-semibold tracking-[-0.02em]">
            {schedule.name}
          </span>
        )}
        <span className="flex items-baseline gap-1.5">
          <span className="text-[48px] leading-none font-semibold tracking-[-0.045em] tabular-nums">
            {clock.digits}
          </span>
          {clock.period && (
            <span className="text-[16px] font-semibold tracking-[-0.01em] text-muted">
              {clock.period}
            </span>
          )}
        </span>

        <span className="mt-3 flex items-center gap-2 text-[13px] text-muted">
          <span className="font-medium text-foreground">{lane}</span>
          <span aria-hidden>·</span>
          <span>
            {daily ? copy.scheduleEveryDay : weekdays ? copy.scheduleWeekdays : null}
            {!daily && !weekdays && (
              <span className="inline-flex gap-1 align-middle">
                {ALL_DAYS.map((day) => (
                  <span
                    key={day}
                    className={cn(
                      "grid size-5 place-items-center rounded-full text-[10px] font-semibold uppercase",
                      schedule.days.includes(day)
                        ? "bg-foreground/[0.12] text-foreground"
                        : "text-muted/50",
                    )}
                  >
                    {dayLabel(day, locale, "narrow")}
                  </span>
                ))}
              </span>
            )}
          </span>
          {!schedule.enabled && (
            <>
              <span aria-hidden>·</span>
              <span>{copy.schedulePaused}</span>
            </>
          )}
        </span>

        <span className="mt-4 block space-y-2 border-t border-line pt-3.5">
          {bridges.map((port) => {
            const reading = readLane(port, schedule.mode);
            return (
              <span key={port.portNumber} className="flex items-center gap-3 text-[14px]">
                <span aria-hidden className={cn("size-2 shrink-0 rounded-full", TONE_DOT[reading.tone])} />
                <span className="min-w-0 flex-1 truncate font-medium">{portName(port).title}</span>
                <span className="shrink-0 text-muted tabular-nums">{waitLabel(reading, copy)}</span>
              </span>
            );
          })}
        </span>
      </button>

      <Switch
        on={schedule.enabled}
        label={
          schedule.name
            ? schedule.enabled
              ? copy.schedulePauseName(schedule.name)
              : copy.scheduleResumeName(schedule.name)
            : schedule.enabled
              ? copy.schedulePause(time)
              : copy.scheduleResume(time)
        }
        onToggle={onToggle}
      />
    </div>
  );
}

function Switch({ on, label, onToggle }: { on: boolean; label: string; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      className="absolute top-4 right-4 grid h-11 w-14 place-items-center"
    >
      <HapticPad />
      <span
        aria-hidden
        className={cn(
          "relative h-[31px] w-[51px] rounded-full transition-colors duration-200 ease-out",
          on ? "bg-accent" : "bg-foreground/20",
        )}
      >
        <span
          className={cn(
            "absolute top-[2px] left-[2px] size-[27px] rounded-full bg-white shadow-sm transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
            on && "translate-x-5",
          )}
        />
      </span>
    </button>
  );
}

function ScheduleTest({ ports, mode }: { ports: string[]; mode: Mode }) {
  const { copy } = useLocale();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function send() {
    if (busy) return;
    // Permission has to be the first await, or the browser drops the prompt.
    const enabled = await enablePush();
    if (enabled !== "ok") {
      haptic("error");
      setNote(
        enabled === "denied"
          ? copy.alertDenied
          : enabled === "needs-install"
            ? copy.alertNeedsInstall
            : enabled === "unsupported"
              ? copy.alertUnsupported
              : copy.alertFailed,
      );
      return;
    }
    setBusy(true);
    setNote(null);
    try {
      const endpoint = await pushEndpoint();
      const response = endpoint
        ? await fetch("/api/alerts/test", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint, ports, mode }),
          })
        : null;
      if (!response?.ok) {
        haptic("error");
        setNote(copy.alertFailed);
        return;
      }
      haptic("success");
      setNote(copy.scheduleTestSent);
    } catch {
      haptic("error");
      setNote(copy.alertFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8 flex flex-col items-center">
      <button
        type="button"
        onClick={() => void send()}
        disabled={busy}
        className="relative h-11 rounded-full px-4 text-[15px] font-medium text-accent transition-opacity active:opacity-60 disabled:opacity-40"
      >
        <HapticPad />
        {busy ? copy.scheduleTestSending : copy.scheduleTest}
      </button>
      {note && (
        <p className="mx-auto mt-2 max-w-[32ch] text-center text-[13px] leading-relaxed text-muted">
          {note}
        </p>
      )}
    </div>
  );
}

function Empty({
  body,
  action,
  onAction,
  children,
}: {
  body: string;
  action: string;
  onAction: () => void;
  children?: ReactNode;
}) {
  const { copy } = useLocale();
  const reduce = useReducedMotion();
  const settle = reduce ? REDUCED : SPRING.move;
  const from = reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(8px)" };
  return (
    <div className="flex min-h-[calc(100dvh-19.5rem)] flex-col items-center justify-center text-center lg:min-h-[calc(100dvh-14rem)]">
      <motion.div
        aria-hidden
        initial={reduce ? { opacity: 0 } : { opacity: 0, transform: "scale(0.92)" }}
        animate={{ opacity: 1, transform: "scale(1)" }}
        transition={{ ...settle, delay: 0.04 }}
        className="text-foreground"
      >
        <Alarm />
      </motion.div>
      <motion.h3
        initial={from}
        animate={{ opacity: 1, transform: "translateY(0px)" }}
        transition={{ ...settle, delay: 0.18 }}
        className="mt-6 text-[22px] leading-tight font-semibold tracking-[-0.025em]"
      >
        {copy.scheduleEmptyTitle}
      </motion.h3>
      <motion.p
        initial={from}
        animate={{ opacity: 1, transform: "translateY(0px)" }}
        transition={{ ...settle, delay: 0.24 }}
        className="mx-auto mt-2 max-w-[32ch] text-[15px] leading-relaxed text-muted"
      >
        {body}
      </motion.p>
      <motion.button
        type="button"
        onClick={onAction}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        whileTap={reduce ? undefined : { scale: 0.96 }}
        transition={{
          opacity: reduce ? REDUCED : { ...SPRING.snap, delay: 0.3 },
          scale: SPRING.snap,
        }}
        className="relative mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-accent px-6 text-[16px] font-semibold text-accent-ink"
      >
        <HapticPad />
        <PlusIcon size={20} aria-hidden />
        {action}
      </motion.button>
      {children}
    </div>
  );
}

/**
 * The body (face, hands, feet) rocks on its own axis as one piece, in the same ring-pause-ring
 * pattern as the bells, which shake side to side out of phase with each other.
 */
function Alarm() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-36"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <g className="schedule-wobble">
        <circle cx="12" cy="13" r="7.25" />
        <path d="M12 13V9.25" />
        <path d="m12 13 2.25 2" />
        <path d="M6.6 18.55 4.5 20.75" />
        <path d="m17.4 18.55 2.1 2.2" />
      </g>
      <g className="schedule-bell">
        <path d="M5.25 3.75 2.75 6.25" />
      </g>
      <g className="schedule-bell schedule-bell-right">
        <path d="m21.25 6.25-2.5-2.5" />
      </g>
    </svg>
  );
}

function ListSkeleton() {
  return (
    <div aria-hidden className="space-y-3">
      {[0, 1].map((i) => (
        <div key={i} className="shimmer h-[168px] rounded-3xl" />
      ))}
    </div>
  );
}