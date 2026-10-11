"use client";

import { useLocale } from "@/components/locale-provider";
import { cn } from "@/lib/cn";
import { haptic } from "@/lib/haptics";
import { QuestionMarkCircleIcon } from "@heroicons-animated/react/question-mark-circle";
import { MicrophoneIcon } from "@heroicons-animated/react/microphone";
import { PaperAirplaneIcon } from "@heroicons-animated/react/paper-airplane";
import { StopIcon } from "@heroicons-animated/react/stop";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { HapticPad } from "./haptic-pad";
import { SPRING } from "./motion";
import { usePublishPaneChrome } from "./pane-header";

type Message = { role: "user" | "assistant"; content: string };
type Status = "idle" | "recording" | "transcribing" | "thinking";

/** A recording longer than this stops itself. The server rejects very large files too. */
const MAX_RECORD_SECONDS = 45;
const MAX_CHARS = 1000;

type Props = {
  /** This tab owns the phone header, which stays put while the body slides. */
  ownsHeader: boolean;
};

function recorderType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  for (const type of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"]) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

function extensionFor(type: string): string {
  if (type.includes("mp4")) return "m4a";
  if (type.includes("ogg")) return "ogg";
  return "webm";
}

export function AskPane({ ownsHeader }: Props) {
  const { locale, copy } = useLocale();
  const reduce = useReducedMotion();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);

  const endRef = useRef<HTMLDivElement>(null);
  const abort = useRef<AbortController | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef(0);
  const history = useRef<Message[]>([]);
  const busy = status !== "idle";

  usePublishPaneChrome(
    ownsHeader,
    { subtitle: copy.askSubtitle, action: "none", checking: false, refreshing: false },
    { onRefresh: () => {}, onDone: () => {}, onAdd: () => {} },
  );

  const releaseMic = useCallback(() => {
    window.clearInterval(timer.current);
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
  }, []);

  useEffect(
    () => () => {
      abort.current?.abort();
      const active = recorder.current;
      if (active && active.state !== "inactive") {
        active.onstop = null;
        active.stop();
      }
      releaseMic();
    },
    [releaseMic],
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
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
        const body = (await response.json().catch(() => null)) as { reply?: unknown } | null;
        if (!response.ok || typeof body?.reply !== "string") throw new Error("ask failed");
        const reply: Message = { role: "assistant", content: body.reply };
        history.current = [...history.current, reply];
        setMessages(history.current);
        haptic("success");
      } catch (caught) {
        if (controller.signal.aborted || (caught instanceof Error && caught.name === "AbortError")) {
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

  const transcribe = useCallback(
    async (blob: Blob, type: string) => {
      setStatus("transcribing");
      const controller = new AbortController();
      abort.current = controller;
      try {
        const form = new FormData();
        form.set("audio", blob, `voice.${extensionFor(type)}`);
        const response = await fetch("/api/transcribe", {
          method: "POST",
          body: form,
          signal: controller.signal,
        });
        if (response.status === 429) {
          setError(copy.askBusy);
          haptic("error");
          setStatus("idle");
          return;
        }
        const body = (await response.json().catch(() => null)) as { text?: unknown } | null;
        if (!response.ok || typeof body?.text !== "string") throw new Error("transcribe failed");
        const text = body.text.trim();
        if (!text) {
          setError(copy.askNoSpeech);
          haptic("error");
          setStatus("idle");
          return;
        }
        abort.current = null;
        await send(text);
      } catch (caught) {
        if (controller.signal.aborted || (caught instanceof Error && caught.name === "AbortError")) {
          return;
        }
        setError(copy.askVoiceFailed);
        haptic("error");
        setStatus("idle");
      }
    },
    [copy, send],
  );

  const stopRecording = useCallback(() => {
    const active = recorder.current;
    if (active && active.state !== "inactive") active.stop();
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError(copy.askMicUnsupported);
      haptic("error");
      return;
    }
    let media: MediaStream;
    try {
      media = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError(copy.askMicDenied);
      haptic("error");
      return;
    }
    const type = recorderType();
    const chunks: Blob[] = [];
    const active = new MediaRecorder(media, type ? { mimeType: type } : undefined);
    stream.current = media;
    recorder.current = active;
    active.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    active.onstop = () => {
      releaseMic();
      recorder.current = null;
      const mime = active.mimeType || type || "audio/webm";
      const blob = new Blob(chunks, { type: mime });
      if (blob.size < 1000) {
        setError(copy.askNoSpeech);
        setStatus("idle");
        return;
      }
      void transcribe(blob, mime);
    };
    active.start();
    haptic("medium");
    setSeconds(0);
    setStatus("recording");
    const started = Date.now();
    timer.current = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - started) / 1000);
      setSeconds(elapsed);
      if (elapsed >= MAX_RECORD_SECONDS) stopRecording();
    }, 250);
  }, [copy, releaseMic, transcribe, stopRecording]);

  function onMic() {
    if (status === "recording") {
      haptic("selection");
      stopRecording();
    } else if (status === "idle") {
      void startRecording();
    }
  }

  function onSubmit() {
    if (busy) return;
    haptic("light");
    void send(draft);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    onSubmit();
  }

  function clear() {
    haptic("selection");
    abort.current?.abort();
    abort.current = null;
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
          <h2 className="text-[34px] leading-none font-bold tracking-[-0.035em]">{copy.ask}</h2>
          <p className="mt-2 truncate text-[14px] leading-none text-muted">{copy.askSubtitle}</p>
        </div>
      </header>

      <div className="pane-body flex flex-col gap-3">
        {empty ? (
          <div className="rounded-3xl bg-surface p-6">
            <div className="grid size-12 place-items-center rounded-2xl bg-foreground/[0.07]">
              <QuestionMarkCircleIcon size={24} aria-hidden />
            </div>
            <h3 className="mt-4 text-[20px] font-bold tracking-[-0.02em]">{copy.askEmptyTitle}</h3>
            <p className="mt-1.5 text-[15px] leading-snug text-muted">{copy.askEmptyBody}</p>
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
                    "max-w-[88%] rounded-3xl px-4 py-2.5 text-[16px] leading-snug whitespace-pre-wrap",
                    message.role === "user"
                      ? "self-end rounded-br-lg bg-accent text-accent-ink"
                      : "self-start rounded-bl-lg bg-surface",
                  )}
                >
                  {message.content}
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
          {(status === "thinking" || status === "transcribing") && (
            <motion.p
              key={status}
              initial={appear}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={SPRING.snap}
              role="status"
              className="self-start rounded-3xl rounded-bl-lg bg-surface px-4 py-2.5 text-[15px] text-muted"
              style={reduce ? undefined : { animation: "ask-pulse 1.4s ease-in-out infinite" }}
            >
              {status === "thinking" ? copy.askThinking : copy.askTranscribing}
            </motion.p>
          )}
        </AnimatePresence>

        {error && (
          <p role="alert" className="self-center px-2 text-center text-[14px] text-rose-400">
            {error}
          </p>
        )}

        <div ref={endRef} aria-hidden />

        {/* The phone tab bar floats over the bottom of the scroller, so the composer rests above it. */}
        <div className="sticky bottom-24 z-10 lg:bottom-4">
          <div className="relative rounded-[28px] p-1.5">
            <div aria-hidden className="glass pointer-events-none absolute inset-0 rounded-[28px]" />
            <div className="relative flex items-end gap-1.5">
              {status === "recording" ? (
                <div
                  role="status"
                  className="flex h-11 min-w-0 flex-1 items-center gap-2.5 px-3.5 text-[15px] text-muted"
                >
                  <span
                    aria-hidden
                    className="size-2.5 shrink-0 rounded-full bg-rose-400"
                    style={reduce ? undefined : { animation: "ask-pulse 1s ease-in-out infinite" }}
                  />
                  <span className="truncate">{copy.askRecording}</span>
                  <span className="ml-auto tabular-nums">
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
                  className="max-h-32 min-h-11 min-w-0 flex-1 resize-none bg-transparent px-3.5 py-[11px] text-[16px] leading-snug outline-none placeholder:text-muted disabled:opacity-60"
                  style={{ fieldSizing: "content" } as React.CSSProperties}
                />
              )}

              <motion.button
                type="button"
                onClick={onMic}
                disabled={status === "thinking" || status === "transcribing"}
                aria-label={status === "recording" ? copy.askStop : copy.askMic}
                whileTap={reduce ? undefined : { scale: 0.92 }}
                transition={SPRING.snap}
                className={cn(
                  "relative grid size-11 shrink-0 cursor-pointer place-items-center rounded-full disabled:opacity-50",
                  status === "recording"
                    ? "bg-rose-500 text-white"
                    : "bg-foreground/[0.08] text-foreground",
                )}
              >
                <HapticPad />
                {status === "recording" ? (
                  <StopIcon size={20} aria-hidden />
                ) : (
                  <MicrophoneIcon size={20} aria-hidden />
                )}
              </motion.button>

              {status !== "recording" && (
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
          <p className="mt-2 px-3 text-center text-[12px] leading-snug text-muted">{copy.askNote}</p>
        </div>
      </div>
    </div>
  );
}
