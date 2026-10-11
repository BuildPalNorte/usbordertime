"use client";

import { useLocale } from "@/components/locale-provider";
import { cn } from "@/lib/cn";
import { haptic } from "@/lib/haptics";
import { QuestionMarkCircleIcon } from "@/components/wallet/question-mark-circle-icon";
import { MicrophoneIcon } from "@heroicons-animated/react/microphone";
import { PaperAirplaneIcon } from "@heroicons-animated/react/paper-airplane";
import { StopIcon } from "@heroicons-animated/react/stop";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { AskMarkdown } from "./ask-markdown";
import { HapticPad } from "./haptic-pad";
import { SPRING } from "./motion";
import { usePublishPaneChrome } from "./pane-header";

type Message = { role: "user" | "assistant"; content: string };
type Status = "idle" | "listening" | "thinking";

/** Listening longer than this stops itself. */
const MAX_LISTEN_SECONDS = 45;
const MAX_CHARS = 1000;

type Props = {
  /** This tab owns the phone header, which stays put while the body slides. */
  ownsHeader: boolean;
};

type SpeechResultEvent = {
  results: ArrayLike<{ isFinal: boolean; 0?: { transcript: string } }>;
};

type SpeechErrorEvent = { error: string };

type SpeechSession = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: ((event: SpeechErrorEvent) => void) | null;
  onend: (() => void) | null;
};

/** The browser's own speech recognition. No audio is uploaded. */
function speechSession(): SpeechSession | null {
  if (typeof window === "undefined") return null;
  const root = window as unknown as {
    SpeechRecognition?: new () => SpeechSession;
    webkitSpeechRecognition?: new () => SpeechSession;
  };
  const Ctor = root.SpeechRecognition ?? root.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export function AskPane({ ownsHeader }: Props) {
  const { locale, copy } = useLocale();
  const reduce = useReducedMotion();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [heard, setHeard] = useState("");

  const endRef = useRef<HTMLDivElement>(null);
  const abort = useRef<AbortController | null>(null);
  const speech = useRef<SpeechSession | null>(null);
  const heardRef = useRef("");
  /** Words kept when the browser ends a phrase and listening starts again. */
  const carried = useRef("");
  const listening = useRef(false);
  const finishing = useRef(false);
  const timer = useRef(0);
  const history = useRef<Message[]>([]);
  const busy = status !== "idle";

  usePublishPaneChrome(
    ownsHeader,
    {
      subtitle: copy.askSubtitle,
      action: "none",
      checking: false,
      refreshing: false,
    },
    { onRefresh: () => {}, onDone: () => {}, onAdd: () => {} },
  );

  useEffect(
    () => () => {
      abort.current?.abort();
      listening.current = false;
      finishing.current = false;
      window.clearInterval(timer.current);
      try {
        speech.current?.abort();
      } catch {
        // Already stopped.
      }
    },
    [],
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({
      block: "nearest",
      behavior: reduce ? "auto" : "smooth",
    });
  }, [messages, status, reduce]);

  const send = useCallback(
    async (text: string) => {
      const content = text.trim().slice(0, MAX_CHARS);
      if (!content) return;
      const next: Message[] = [...history.current, { role: "user", content }];
      history.current = next;
      setMessages(next);
      setDraft("");
      setError(null);
      setStatus("thinking");

      const controller = new AbortController();
      abort.current?.abort();
      abort.current = controller;
      try {
        const response = await fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: next, locale }),
          signal: controller.signal,
        });
        if (response.status === 429) {
          setError(copy.askBusy);
          haptic("error");
          return;
        }
        const body = (await response.json().catch(() => null)) as {
          reply?: unknown;
        } | null;
        if (!response.ok || typeof body?.reply !== "string")
          throw new Error("ask failed");
        const reply: Message = { role: "assistant", content: body.reply };
        history.current = [...history.current, reply];
        setMessages(history.current);
        haptic("success");
      } catch (caught) {
        if (
          controller.signal.aborted ||
          (caught instanceof Error && caught.name === "AbortError")
        ) {
          return;
        }
        setError(copy.askError);
        haptic("error");
      } finally {
        if (abort.current === controller) {
          abort.current = null;
          setStatus("idle");
        }
      }
    },
    [locale, copy],
  );

  const deliver = useCallback(() => {
    if (!finishing.current) return;
    finishing.current = false;
    listening.current = false;
    window.clearInterval(timer.current);
    const session = speech.current;
    speech.current = null;
    if (session) session.onend = null;
    const text = heardRef.current.trim();
    heardRef.current = "";
    setHeard("");
    setSeconds(0);
    if (!text) {
      setError(copy.askNoSpeech);
      haptic("error");
      setStatus("idle");
      return;
    }
    void send(text);
  }, [copy, send]);

  const stopListening = useCallback(() => {
    if (finishing.current) return;
    finishing.current = true;
    listening.current = false;
    window.clearInterval(timer.current);
    const session = speech.current;
    if (!session) {
      deliver();
      return;
    }
    try {
      session.stop();
    } catch {
      deliver();
      return;
    }
    // stop() is supposed to end the session. If it never does, send what we heard.
    window.setTimeout(() => deliver(), 700);
  }, [deliver]);

  const startListening = useCallback(() => {
    setError(null);
    const session = speechSession();
    if (!session) {
      setError(copy.askMicUnsupported);
      haptic("error");
      return;
    }
    heardRef.current = "";
    carried.current = "";
    setHeard("");
    let restarts = 0;
    session.lang = locale === "es" ? "es-MX" : "en-US";
    session.continuous = true;
    session.interimResults = true;
    session.onresult = (event) => {
      let text = "";
      for (let index = 0; index < event.results.length; index += 1) {
        text += event.results[index][0]?.transcript ?? "";
      }
      const next = `${carried.current} ${text}`.trim();
      heardRef.current = next;
      setHeard(next);
    };
    session.onerror = (event) => {
      if (event.error === "aborted" || event.error === "no-speech") return;
      listening.current = false;
      finishing.current = false;
      window.clearInterval(timer.current);
      speech.current = null;
      setHeard("");
      heardRef.current = "";
      setStatus("idle");
      haptic("error");
      setError(
        event.error === "not-allowed" || event.error === "service-not-allowed"
          ? copy.askMicDenied
          : copy.askVoiceFailed,
      );
    };
    session.onend = () => {
      // Some browsers end the phrase on a pause. Keep going until Stop, within a cap.
      if (listening.current && !finishing.current && restarts < 12) {
        restarts += 1;
        carried.current = heardRef.current;
        try {
          session.start();
          return;
        } catch {
          finishing.current = true;
        }
      } else if (listening.current && !finishing.current) {
        finishing.current = true;
      }
      deliver();
    };
    speech.current = session;
    listening.current = true;
    finishing.current = false;
    try {
      session.start();
    } catch {
      listening.current = false;
      speech.current = null;
      setError(copy.askVoiceFailed);
      haptic("error");
      return;
    }
    haptic("medium");
    setSeconds(0);
    setStatus("listening");
    const started = Date.now();
    timer.current = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - started) / 1000);
      setSeconds(elapsed);
      if (elapsed >= MAX_LISTEN_SECONDS) stopListening();
    }, 250);
  }, [copy, locale, deliver, stopListening]);

  function onMic() {
    if (status === "listening") {
      haptic("selection");
      stopListening();
    } else if (status === "idle") {
      startListening();
    }
  }

  function onSubmit() {
    if (busy) return;
    haptic("light");
    void send(draft);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key !== "Enter" ||
      event.shiftKey ||
      event.nativeEvent.isComposing
    )
      return;
    event.preventDefault();
    onSubmit();
  }

  function clear() {
    haptic("selection");
    abort.current?.abort();
    abort.current = null;
    listening.current = false;
    finishing.current = false;
    window.clearInterval(timer.current);
    try {
      speech.current?.abort();
    } catch {
      // Already stopped.
    }
    speech.current = null;
    heardRef.current = "";
    setHeard("");
    history.current = [];
    setMessages([]);
    setError(null);
    setStatus("idle");
  }

  const empty = messages.length === 0;
  const appear = reduce ? { opacity: 0 } : { opacity: 0, y: 8 };

  return (
    <div>
      <header className="hidden min-h-[4.5rem] items-end justify-between gap-4 pb-5 lg:flex">
        <div className="min-w-0">
          <h2 className="text-[34px] leading-none font-bold tracking-[-0.035em]">
            {copy.ask}
          </h2>
          <p className="mt-2 truncate text-[14px] leading-none text-muted">
            {copy.askSubtitle}
          </p>
        </div>
      </header>

      <div className="pane-body flex flex-col gap-3">
        {empty ? (
          <div className="rounded-3xl bg-surface p-6">
            <div className="grid size-12 place-items-center rounded-2xl bg-foreground/[0.07]">
              <QuestionMarkCircleIcon size={24} aria-hidden />
            </div>
            <h3 className="mt-4 text-[20px] font-bold tracking-[-0.02em]">
              {copy.askEmptyTitle}
            </h3>
            <p className="mt-1.5 text-[15px] leading-snug text-muted">
              {copy.askEmptyBody}
            </p>
            <div className="mt-5 flex flex-col gap-2">
              {copy.askSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    haptic("selection");
                    void send(suggestion);
                  }}
                  className="relative cursor-pointer rounded-2xl bg-foreground/[0.06] px-4 py-3 text-left text-[15px] leading-snug font-medium disabled:opacity-50"
                >
                  <HapticPad />
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <ul className="flex flex-col gap-3" aria-live="polite">
              {messages.map((message, index) => (
                <motion.li
                  key={index}
                  initial={index === messages.length - 1 ? appear : false}
                  animate={{ opacity: 1, y: 0 }}
                  transition={SPRING.snap}
                  className={cn(
                    "max-w-[88%] rounded-3xl px-4 py-2.5 text-[16px] leading-snug",
                    message.role === "user"
                      ? "self-end rounded-br-lg bg-accent text-accent-ink whitespace-pre-wrap"
                      : "self-start rounded-bl-lg bg-surface",
                  )}
                >
                  {message.role === "assistant" ? (
                    <AskMarkdown text={message.content} />
                  ) : (
                    message.content
                  )}
                </motion.li>
              ))}
            </ul>
            <button
              type="button"
              onClick={clear}
              className="relative -mt-1 cursor-pointer self-center rounded-full px-3 py-1.5 text-[13px] font-medium text-muted"
            >
              <HapticPad />
              {copy.askClear}
            </button>
          </>
        )}

        <AnimatePresence initial={false}>
          {status === "thinking" && (
            <motion.p
              key={status}
              initial={appear}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={SPRING.snap}
              role="status"
              className="self-start rounded-3xl rounded-bl-lg bg-surface px-4 py-2.5 text-[15px] text-muted"
              style={
                reduce
                  ? undefined
                  : { animation: "ask-pulse 1.4s ease-in-out infinite" }
              }
            >
              {copy.askThinking}
            </motion.p>
          )}
        </AnimatePresence>

        {error && (
          <p
            role="alert"
            className="self-center px-2 text-center text-[14px] text-rose-400"
          >
            {error}
          </p>
        )}

        <div ref={endRef} aria-hidden />

        {/* The phone tab bar floats over the bottom of the scroller, so the composer rests above it. */}
        <div className="sticky bottom-0 z-10">
          <div className="relative rounded-[28px] p-1.5">
            <div
              aria-hidden
              className="glass ask-composer pointer-events-none absolute inset-0 rounded-[28px]"
            />
            <div className="relative flex items-end gap-1.5">
              {status === "listening" ? (
                <div
                  role="status"
                  className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 px-3.5 py-2.5 text-[15px]"
                >
                  <span
                    aria-hidden
                    className="size-2.5 shrink-0 rounded-full bg-rose-400"
                    style={
                      reduce
                        ? undefined
                        : { animation: "ask-pulse 1s ease-in-out infinite" }
                    }
                  />
                  <span
                    className={cn(
                      "min-w-0 flex-1 leading-snug",
                      heard ? "text-foreground" : "text-muted",
                    )}
                  >
                    {heard || copy.askRecording}
                  </span>
                  <span className="shrink-0 tabular-nums text-muted">
                    0:{String(seconds).padStart(2, "0")}
                  </span>
                </div>
              ) : (
                <textarea
                  value={draft}
                  rows={1}
                  maxLength={MAX_CHARS}
                  disabled={busy}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder={copy.askPlaceholder}
                  aria-label={copy.askPlaceholder}
                  enterKeyHint="send"
                  className="ask-field max-h-32 min-h-11 min-w-0 flex-1 resize-none bg-transparent px-3.5 py-[11px] text-[16px] leading-snug placeholder:text-muted disabled:opacity-60"
                  style={
                    { fieldSizing: "content", outline: "none", boxShadow: "none" } as React.CSSProperties
                  }
                />
              )}

              <motion.button
                type="button"
                onClick={onMic}
                disabled={status === "thinking"}
                aria-label={status === "listening" ? copy.askStop : copy.askMic}
                whileTap={reduce ? undefined : { scale: 0.92 }}
                transition={SPRING.snap}
                className={cn(
                  "relative grid size-11 shrink-0 cursor-pointer place-items-center rounded-full disabled:opacity-50",
                  status === "listening"
                    ? "bg-rose-500 text-white"
                    : "bg-foreground/[0.08] text-foreground",
                )}
              >
                <HapticPad />
                {status === "listening" ? (
                  <StopIcon size={20} aria-hidden />
                ) : (
                  <MicrophoneIcon size={20} aria-hidden />
                )}
              </motion.button>

              {status !== "listening" && (
                <motion.button
                  type="button"
                  onClick={onSubmit}
                  disabled={busy || draft.trim().length === 0}
                  aria-label={copy.askSend}
                  whileTap={reduce ? undefined : { scale: 0.92 }}
                  transition={SPRING.snap}
                  className="relative grid size-11 shrink-0 cursor-pointer place-items-center rounded-full bg-accent text-accent-ink disabled:opacity-40"
                >
                  <HapticPad />
                  <PaperAirplaneIcon size={20} aria-hidden />
                </motion.button>
              )}
            </div>
          </div>
          <p className="mt-2 px-3 text-center text-[12px] leading-snug text-muted">
            {copy.askNote}
          </p>
        </div>
      </div>
    </div>
  );
}
