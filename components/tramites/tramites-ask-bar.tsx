"use client";

import { useLocale } from "@/components/locale-provider";
import { AskMarkdown } from "@/components/wallet/ask-markdown";
import { HapticPad } from "@/components/wallet/haptic-pad";
import { SPRING } from "@/components/wallet/motion";
import { cn } from "@/lib/cn";
import { haptic } from "@/lib/haptics";
import { MicrophoneIcon } from "@heroicons-animated/react/microphone";
import { PaperAirplaneIcon } from "@heroicons-animated/react/paper-airplane";
import { StopIcon } from "@heroicons-animated/react/stop";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";

type Message = { role: "user" | "assistant"; content: string };
type Status = "idle" | "listening" | "thinking";

const MAX_CHARS = 1000;
const MAX_LISTEN_SECONDS = 45;

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

/**
 * Hero ask for /tramites. Same composer and chat shape as the bridges Ask tab:
 * glass bar, mic, send, bubbles, and suggestion chips when empty.
 */
export function TramitesAskBar() {
  const { locale, copy } = useLocale();
  const t = copy.tramites.ask;
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
  const carried = useRef("");
  const listening = useRef(false);
  const finishing = useRef(false);
  const timer = useRef(0);
  const history = useRef<Message[]>([]);
  const busy = status !== "idle";
  const empty = messages.length === 0;
  const appear = reduce ? { opacity: 0 } : { opacity: 0, y: 8 };

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
        const response = await fetch("/api/tramites/ask", {
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
        if (!response.ok || typeof body?.reply !== "string") {
          throw new Error("ask failed");
        }
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

  return (
    <div className="flex w-full max-w-xl flex-col gap-3">
      {!empty ? (
        <>
          <ul className="flex max-h-[280px] flex-col gap-3 overflow-y-auto pr-1 text-left" aria-live="polite">
            {messages.map((message, index) => (
              <motion.li
                key={index}
                initial={index === messages.length - 1 ? appear : false}
                animate={{ opacity: 1, y: 0 }}
                transition={SPRING.snap}
                className={cn(
                  "max-w-[88%] rounded-3xl px-4 py-2.5 text-left text-[16px] leading-snug",
                  message.role === "user"
                    ? "self-end rounded-br-lg bg-[color:var(--t-ink)] text-white whitespace-pre-wrap"
                    : "self-start rounded-bl-lg bg-white text-[color:var(--t-ink)] shadow-[0_18px_40px_-24px_rgba(5,20,70,0.45)]",
                )}
              >
                {message.role === "assistant" ? (
                  <div className="[&_a]:font-semibold [&_a]:text-[color:var(--t-blue)] [&_a]:underline">
                    <AskMarkdown text={message.content} />
                  </div>
                ) : (
                  message.content
                )}
              </motion.li>
            ))}
            <AnimatePresence initial={false}>
              {status === "thinking" && (
                <motion.li
                  key="thinking"
                  initial={appear}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={SPRING.snap}
                  role="status"
                  className="self-start rounded-3xl rounded-bl-lg bg-white/90 px-4 py-2.5 text-left text-[15px] text-[color:var(--t-ink)]/55"
                  style={
                    reduce
                      ? undefined
                      : { animation: "ask-pulse 1.4s ease-in-out infinite" }
                  }
                >
                  {t.thinking}
                </motion.li>
              )}
            </AnimatePresence>
          </ul>
          <button
            type="button"
            onClick={clear}
            className="relative -mt-1 cursor-pointer self-center rounded-full px-3 py-1.5 text-[13px] font-medium text-tfg/75"
          >
            <HapticPad />
            {copy.askClear}
          </button>
        </>
      ) : (
        <AnimatePresence initial={false}>
          {status === "thinking" && (
            <motion.p
              key="thinking-empty"
              initial={appear}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={SPRING.snap}
              role="status"
              className="self-start rounded-3xl rounded-bl-lg bg-white/90 px-4 py-2.5 text-left text-[15px] text-[color:var(--t-ink)]/55"
              style={
                reduce
                  ? undefined
                  : { animation: "ask-pulse 1.4s ease-in-out infinite" }
              }
            >
              {t.thinking}
            </motion.p>
          )}
        </AnimatePresence>
      )}

      {error ? (
        <p role="alert" className="px-1 text-center text-[14px] text-tdanger">
          {error}
        </p>
      ) : null}

      <div className="relative rounded-[28px] p-1.5">
        <div
          aria-hidden
          className="glass ask-composer pointer-events-none absolute inset-0 rounded-[28px] !border-0 !bg-white/92 shadow-[0_24px_50px_-24px_rgba(5,20,70,0.55)]"
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
                  heard ? "text-[color:var(--t-ink)]" : "text-[color:var(--t-ink)]/45",
                )}
              >
                {heard || copy.askRecording}
              </span>
              <span className="shrink-0 tabular-nums text-[color:var(--t-ink)]/45">
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
              placeholder={t.placeholder}
              aria-label={t.label}
              enterKeyHint="send"
              className="ask-field max-h-32 min-h-11 min-w-0 flex-1 resize-none bg-transparent px-3.5 py-[11px] text-[16px] leading-snug text-[color:var(--t-ink)] placeholder:text-[color:var(--t-ink)]/45 disabled:opacity-60"
              style={
                {
                  fieldSizing: "content",
                  outline: "none",
                  boxShadow: "none",
                } as CSSProperties
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
                : "bg-[color:var(--t-ink)]/[0.08] text-[color:var(--t-ink)]",
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
              className="relative grid size-11 shrink-0 cursor-pointer place-items-center rounded-full bg-[color:var(--t-blue)] text-white disabled:opacity-40"
            >
              <HapticPad />
              <PaperAirplaneIcon size={20} aria-hidden />
            </motion.button>
          )}
        </div>
      </div>

      {empty ? (
        <ul className="flex flex-wrap gap-2">
          {t.suggestions.map((suggestion) => (
            <li key={suggestion}>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  haptic("selection");
                  void send(suggestion);
                }}
                className="relative cursor-pointer rounded-full bg-tfg/[0.08] px-3.5 py-2 text-[13px] font-semibold text-tfg ring-1 ring-tfg/20 backdrop-blur transition-colors hover:bg-tfg/[0.14] disabled:opacity-50"
              >
                <HapticPad />
                {suggestion}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="px-1 text-center text-[12px] leading-snug text-tfg/70">
        {t.disclaimer}
      </p>
      <div ref={endRef} aria-hidden />
    </div>
  );
}
