"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SPRING } from "./motion";

type Note = { id: number; title: string; body: string; url: string };

/**
 * The banner for a push that arrives while this page is on screen. macOS does not banner a
 * notification from the app you're looking at, so the service worker asks the page to show it.
 */
export function PushBanner() {
  const reduce = useReducedMotion();
  const router = useRouter();
  const [note, setNote] = useState<Note | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      const data = event.data as {
        type?: unknown;
        title?: unknown;
        body?: unknown;
        url?: unknown;
      } | null;
      if (!data || data.type !== "wait-alert" || typeof data.title !== "string") return;
      const url = typeof data.url === "string" && data.url.startsWith("/") ? data.url : "/";
      setNote({
        id: Date.now(),
        title: data.title,
        body: typeof data.body === "string" ? data.body : "",
        url,
      });
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    if (!note) return;
    const id = window.setTimeout(() => setNote((current) => (current?.id === note.id ? null : current)), 8000);
    return () => window.clearTimeout(id);
  }, [note]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <AnimatePresence>
        {note && (
          <motion.button
            key={note.id}
            type="button"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.98 }}
            transition={reduce ? { duration: 0.16 } : SPRING.pop}
            onClick={() => {
              const url = note.url;
              setNote(null);
              router.push(url, { scroll: false });
            }}
            className="glass pointer-events-auto w-full max-w-sm rounded-2xl px-4 py-3 text-left"
          >
            <p className="text-[15px] leading-tight font-semibold tracking-[-0.01em]">{note.title}</p>
            {note.body ? (
              <p className="mt-1 text-[13px] leading-snug text-muted">{note.body}</p>
            ) : null}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
