"use client";

import type { Announcement, AnnouncementSurface } from "@/lib/announcement";
import {
  MAX_ANNOUNCEMENT_BODY,
  MAX_ANNOUNCEMENT_TITLE,
} from "@/lib/announcement";
import { cn } from "@/lib/cn";
import { haptic } from "@/lib/haptics";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useState, type Dispatch, type SetStateAction } from "react";

const WHEN = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Chicago",
});

/** Critically damped, no overshoot - this arrives, it doesn't bounce. */
const ENTER = { type: "spring" as const, bounce: 0, duration: 0.4 };

type Problem = "empty" | "no-devices" | "failed";

/**
 * Sends one push notification to every device on file right now - "the app changed, come look" -
 * distinct from a wait alert or a schedule, which are each scoped to one account.
 */
export function AnnouncementComposer({
  history,
  setHistory,
}: {
  history: Announcement[];
  setHistory: Dispatch<SetStateAction<Announcement[]>>;
}) {
  const reduce = useReducedMotion();
  const titleId = useId();
  const bodyId = useId();
  const urlId = useId();
  const surfaceId = useId();
  const historyId = useId();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("/");
  const [surface, setSurface] = useState<AnnouncementSurface>("modal");
  const [sending, setSending] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [justSentId, setJustSentId] = useState<string | null>(null);
  const [toggleProblem, setToggleProblem] = useState(false);
  const [later, setLater] = useState(false);
  const [when, setWhen] = useState("");
  const whenId = useId();

  const titleLeft = MAX_ANNOUNCEMENT_TITLE - title.length;
  const bodyLeft = MAX_ANNOUNCEMENT_BODY - body.length;
  const whenIso = later && when ? new Date(when) : null;
  const whenValid =
    !later || (whenIso !== null && whenIso.getTime() >= Date.now() + 60_000);
  const ready =
    title.trim().length > 0 && body.trim().length > 0 && whenValid && !sending;

  const send = async () => {
    if (!ready) {
      haptic("error");
      setProblem("empty");
      return;
    }
    haptic("selection");
    setSending(true);
    setProblem(null);
    try {
      const response = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          url: url.trim() || "/",
          surface,
          scheduledFor: later && whenIso ? whenIso.toISOString() : undefined,
        }),
      });
      if (!response.ok) {
        haptic("error");
        setProblem(response.status === 409 ? "no-devices" : "failed");
        return;
      }
      const data = (await response.json()) as { announcement: Announcement };
      haptic("success");
      setHistory((current) =>
        data.announcement.status === "scheduled"
          ? [data.announcement, ...current]
          : [
              data.announcement,
              ...current.map((entry) => ({ ...entry, active: false })),
            ],
      );
      setLater(false);
      setWhen("");
      setJustSentId(data.announcement.id);
      setTitle("");
      setBody("");
      setUrl("/");
      setSurface("modal");
    } catch {
      haptic("error");
      setProblem("failed");
    } finally {
      setSending(false);
    }
  };

  const cancel = async (id: string) => {
    haptic("selection");
    setToggleProblem(false);
    const before = history;
    setHistory((current) => current.filter((entry) => entry.id !== id));
    try {
      const response = await fetch("/api/admin/announcements", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error("rejected");
    } catch {
      haptic("error");
      setHistory(before);
      setToggleProblem(true);
    }
  };

  /** Optimistic: the switch moves at once and goes back if the server says no. */
  const setActive = async (id: string, active: boolean) => {
    haptic("selection");
    setToggleProblem(false);
    const before = history;
    // One live at a time: switching one on switches the rest off.
    setHistory((current) =>
      current.map((entry) => ({
        ...entry,
        active: entry.id === id ? active : active ? false : entry.active,
      })),
    );
    try {
      const response = await fetch("/api/admin/announcements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, active }),
      });
      if (!response.ok) throw new Error("rejected");
    } catch {
      haptic("error");
      setHistory(before);
      setToggleProblem(true);
    }
  };

  const message =
    problem === "empty"
      ? "Title and body can't be empty."
      : problem === "no-devices"
        ? "No device has notifications on yet."
        : problem === "failed"
          ? "That didn't go out. Try again."
          : null;

  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:items-start md:gap-10">
      <div className="rounded-3xl border border-line bg-surface px-5 py-5">
        <div className="space-y-5">
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <label
                htmlFor={titleId}
                className="text-[12px] font-semibold tracking-[0.06em] text-muted uppercase"
              >
                Title
              </label>
              <span className="text-[12px] text-muted tabular-nums">
                {titleLeft}
              </span>
            </div>
            <input
              id={titleId}
              type="text"
              enterKeyHint="next"
              autoComplete="off"
              maxLength={MAX_ANNOUNCEMENT_TITLE}
              value={title}
              onChange={(event) => {
                setProblem(null);
                setTitle(event.target.value);
              }}
              placeholder="New: live camera at Veterans"
              className="mt-2 block h-12 w-full appearance-none rounded-2xl bg-background px-4 text-[16px] text-foreground outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-accent"
            />
          </div>

          <div>
            <div className="flex items-baseline justify-between gap-3">
              <label
                htmlFor={bodyId}
                className="text-[12px] font-semibold tracking-[0.06em] text-muted uppercase"
              >
                Body
              </label>
              <span className="text-[12px] text-muted tabular-nums">
                {bodyLeft}
              </span>
            </div>
            <textarea
              id={bodyId}
              rows={2}
              maxLength={MAX_ANNOUNCEMENT_BODY}
              value={body}
              onChange={(event) => {
                setProblem(null);
                setBody(event.target.value);
              }}
              placeholder="Watch Brownsville's bridges live, right from the card."
              className="mt-2 block w-full resize-none appearance-none rounded-2xl bg-background px-4 py-3 text-[15px] leading-snug text-foreground outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-accent"
            />
          </div>

          <div>
            <div
              id={surfaceId}
              className="text-[12px] font-semibold tracking-[0.06em] text-muted uppercase"
            >
              Shows as
            </div>
            <div
              role="radiogroup"
              aria-labelledby={surfaceId}
              className="mt-2 grid grid-cols-2 gap-1 rounded-full bg-background p-1"
            >
              {(
                [
                  ["banner", "Banner"],
                  ["modal", "Modal"],
                ] as const
              ).map(([value, label]) => {
                const selected = surface === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => {
                      if (selected) return;
                      haptic("selection");
                      setProblem(null);
                      setSurface(value);
                    }}
                    className={cn(
                      "h-10 rounded-full text-[15px] font-medium",
                      selected ? "bg-foreground text-background" : "text-muted",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[12px] leading-snug text-muted">
              {surface === "banner"
                ? "Sits under the bridges header until they dismiss it."
                : "Covers the screen until they close it."}
            </p>
          </div>

          <div>
            <label
              htmlFor={urlId}
              className="text-[12px] font-semibold tracking-[0.06em] text-muted uppercase"
            >
              Opens
            </label>
            <input
              id={urlId}
              type="text"
              enterKeyHint="send"
              autoComplete="off"
              value={url}
              onChange={(event) => {
                setProblem(null);
                setUrl(event.target.value);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") void send();
              }}
              placeholder="/"
              className="mt-2 block h-11 w-full appearance-none rounded-2xl bg-background px-4 font-mono text-[13px] text-foreground outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-accent"
            />
            <p className="mt-2 text-[12px] leading-snug text-muted">
              A path on this site, like <code>/</code> or <code>/?lang=es</code>
              . Tapping the notification opens it.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <label
                htmlFor={whenId}
                className="text-[12px] font-semibold tracking-[0.06em] text-muted uppercase"
              >
                Schedule for later
              </label>
              <button
                type="button"
                role="switch"
                aria-checked={later}
                aria-label="Schedule for later"
                onClick={() => {
                  haptic("selection");
                  setProblem(null);
                  setLater((value) => !value);
                }}
                className="group -my-2 -mr-1 grid size-11 shrink-0 place-items-center"
              >
                <span
                  className={cn(
                    "relative h-[26px] w-[44px] rounded-full transition-colors duration-200",
                    later ? "bg-accent" : "bg-surface-strong",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-[3px] left-[3px] size-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out group-active:scale-90",
                      later && "translate-x-[18px]",
                    )}
                  />
                </span>
              </button>
            </div>
            {later && (
              <>
                <input
                  id={whenId}
                  type="datetime-local"
                  value={when}
                  onChange={(event) => {
                    setProblem(null);
                    setWhen(event.target.value);
                  }}
                  className="mt-2 block h-12 w-full appearance-none rounded-2xl bg-background px-4 text-[16px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-accent"
                />
                <p className="mt-2 text-[12px] leading-snug text-muted">
                  In your time zone. The check runs every 15 minutes, so it can
                  go out up to 15 minutes late.
                </p>
              </>
            )}
          </div>

          {message && (
            <p role="alert" className="text-[13px] leading-snug text-danger">
              {message}
            </p>
          )}

          <button
            type="button"
            disabled={!ready}
            aria-busy={sending}
            onClick={() => void send()}
            className={cn(
              "h-12 w-full rounded-full bg-accent text-[16px] font-semibold text-accent-ink transition-transform duration-150 ease-out active:scale-[0.98] disabled:opacity-50",
              sending && !reduce && "animate-pulse",
            )}
          >
            {sending
              ? later
                ? "Scheduling…"
                : "Sending…"
              : later
                ? "Schedule"
                : "Send"}
          </button>
        </div>
      </div>

      <section className="min-w-0" aria-labelledby={historyId}>
        <h3
          id={historyId}
          className="text-[15px] font-semibold tracking-[-0.01em]"
        >
          Sent
        </h3>
        <p className="mt-1 text-[13px] leading-snug text-muted">
          Only one shows in the app, the one that is on. To bring back an older
          one, turn the newest off and the older one on. A push already
          delivered stays delivered.
        </p>
        {toggleProblem && (
          <p role="alert" className="mt-2 text-[13px] text-danger">
            That change did not save. Try again.
          </p>
        )}
        {history.length === 0 ? (
          <p className="mt-3 text-[15px] text-muted">Nothing sent yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface">
            <AnimatePresence initial={false}>
              {history.map((entry) => (
                <motion.li
                  key={entry.id}
                  layout={!reduce}
                  initial={
                    entry.id === justSentId && !reduce
                      ? { opacity: 0, y: -8 }
                      : false
                  }
                  animate={{ opacity: 1, y: 0 }}
                  transition={reduce ? { duration: 0.12 } : ENTER}
                  className="flex items-start gap-4 px-4 py-3"
                >
                  <div
                    className={cn(
                      "min-w-0 flex-1",
                      !entry.active && entry.status === "sent" && "opacity-55",
                    )}
                  >
                    <p className="truncate text-[15px] font-medium">
                      {entry.title}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-muted">
                      {entry.body}
                    </p>
                    <p className="mt-1 text-[12px] text-muted tabular-nums">
                      {entry.status === "sent" ? (
                        <>
                          {entry.surface === "banner" ? "Banner" : "Modal"},{" "}
                          {WHEN.format(new Date(entry.sentAt))},{" "}
                          {entry.recipients.toLocaleString("en-US")}{" "}
                          {entry.recipients === 1 ? "device" : "devices"}
                        </>
                      ) : (
                        <>
                          {entry.status === "failed"
                            ? "No device to send to, "
                            : "Scheduled for "}
                          {entry.scheduledFor
                            ? WHEN.format(new Date(entry.scheduledFor))
                            : ""}{" "}
                          CT
                        </>
                      )}
                    </p>
                  </div>
                  {entry.status !== "sent" ? (
                    <button
                      type="button"
                      onClick={() => void cancel(entry.id)}
                      aria-label={`Cancel "${entry.title}"`}
                      className="-my-1 -mr-1 h-11 shrink-0 rounded-full px-3 text-[14px] font-medium text-danger"
                    >
                      Cancel
                    </button>
                  ) : (
                    <button
                      type="button"
                      role="switch"
                      aria-checked={entry.active}
                      aria-label={`Show "${entry.title}" in the app`}
                      onClick={() => void setActive(entry.id, !entry.active)}
                      className="group -my-1 -mr-1 grid size-11 shrink-0 place-items-center"
                    >
                      <span
                        className={cn(
                          "relative h-[26px] w-[44px] rounded-full transition-colors duration-200",
                          entry.active ? "bg-accent" : "bg-surface-strong",
                        )}
                      >
                        <span
                          className={cn(
                            "absolute top-[3px] left-[3px] size-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out group-active:scale-90",
                            entry.active && "translate-x-[18px]",
                          )}
                        />
                      </span>
                    </button>
                  )}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </section>
    </div>
  );
}
