"use client";

import type { Announcement } from "@/lib/announcement";
import { MAX_ANNOUNCEMENT_BODY, MAX_ANNOUNCEMENT_TITLE } from "@/lib/announcement";
import { cn } from "@/lib/cn";
import { haptic } from "@/lib/haptics";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useState } from "react";

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
export function AnnouncementComposer({ initial }: { initial: Announcement[] }) {
  const reduce = useReducedMotion();
  const titleId = useId();
  const bodyId = useId();
  const urlId = useId();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("/");
  const [history, setHistory] = useState(initial);
  const [sending, setSending] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [justSentId, setJustSentId] = useState<string | null>(null);

  const titleLeft = MAX_ANNOUNCEMENT_TITLE - title.length;
  const bodyLeft = MAX_ANNOUNCEMENT_BODY - body.length;
  const ready = title.trim().length > 0 && body.trim().length > 0 && !sending;

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
        body: JSON.stringify({ title, body, url: url.trim() || "/" }),
      });
      if (!response.ok) {
        haptic("error");
        setProblem(response.status === 409 ? "no-devices" : "failed");
        return;
      }
      const data = (await response.json()) as { announcement: Announcement };
      haptic("success");
      setHistory((current) => [data.announcement, ...current]);
      setJustSentId(data.announcement.id);
      setTitle("");
      setBody("");
      setUrl("/");
    } catch {
      haptic("error");
      setProblem("failed");
    } finally {
      setSending(false);
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
    <div className="flex flex-col gap-6">
      <div className="rounded-3xl border border-line bg-surface px-4 py-4">
        <div className="space-y-4">
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor={titleId} className="text-[12px] font-semibold tracking-[0.06em] text-muted uppercase">
                Title
              </label>
              <span className="text-[12px] text-muted tabular-nums">{titleLeft}</span>
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
              <label htmlFor={bodyId} className="text-[12px] font-semibold tracking-[0.06em] text-muted uppercase">
                Body
              </label>
              <span className="text-[12px] text-muted tabular-nums">{bodyLeft}</span>
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
            <label htmlFor={urlId} className="text-[12px] font-semibold tracking-[0.06em] text-muted uppercase">
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
              A path on this site, like <code>/</code> or <code>/?lang=es</code>. Tapping the notification opens it.
            </p>
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
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
      </div>

      {history.length === 0 ? (
        <p className="text-[15px] text-muted">Nothing sent yet.</p>
      ) : (
        <div className="@container overflow-x-auto overscroll-x-contain rounded-3xl border border-line bg-surface">
          <ul className="w-max min-w-full divide-y divide-line">
            <AnimatePresence initial={false}>
              {history.map((entry) => (
                <motion.li
                  key={entry.id}
                  layout={!reduce}
                  initial={entry.id === justSentId && !reduce ? { opacity: 0, y: -8 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  transition={reduce ? { duration: 0.12 } : ENTER}
                  className="px-4 py-3"
                >
                  <div className="flex w-full items-baseline justify-between gap-4 whitespace-nowrap">
                    <p className="truncate text-[15px] font-medium">{entry.title}</p>
                    <p className="shrink-0 text-[13px] text-muted tabular-nums">
                      {entry.recipients.toLocaleString("en-US")} {entry.recipients === 1 ? "device" : "devices"}
                    </p>
                  </div>
                  <p className="mt-1 truncate text-[13px] text-muted">{entry.body}</p>
                  <p className="mt-1 text-[12px] text-muted">{WHEN.format(new Date(entry.sentAt))}</p>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </div>
      )}
    </div>
  );
}
