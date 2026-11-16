"use client";

import { useLocale } from "@/components/locale-provider";
import { cn } from "@/lib/cn";
import type { Unread } from "@/lib/check-in";

/** Past this the number stops being useful and reads "9+". */
const SHOWN_MAX = 9;

/**
 * A speech bubble with how many chat messages are new. A reply to the rider's own message fills it
 * in, so "someone answered you" stands apart from "the chat moved". Decoration for sighted riders;
 * screen readers get the full sentence.
 */
export function ChatUnreadPill({
  unread,
  tone,
  className,
}: {
  unread: Unread;
  /** `card` sits on a colored card, `accent` on the accent-filled chat button, `muted` on its closed row. */
  tone: "card-light" | "card-dark" | "accent" | "muted";
  className?: string;
}) {
  const { copy } = useLocale();
  const answered = unread.replies > 0;
  const count = unread.messages > SHOWN_MAX ? `${SHOWN_MAX}+` : String(unread.messages);
  const palette = {
    "card-light": answered ? "bg-white text-[#10131a]" : "bg-white/25 text-white",
    "card-dark": answered ? "bg-[#10131a] text-white" : "bg-black/12 text-[#10131a]",
    muted: answered ? "bg-accent text-accent-ink" : "bg-surface-strong text-foreground",
    accent: answered ? "bg-accent-ink text-accent" : "bg-accent-ink/20 text-accent-ink",
  }[tone];
  return (
    <span
      role="img"
      aria-label={copy.chatUnreadLabel(unread.messages, unread.replies)}
      className={cn(
        "inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center gap-1 rounded-full px-1.5 text-[11px] leading-none font-semibold tabular-nums",
        palette,
        className,
      )}
    >
      <svg aria-hidden viewBox="0 0 16 16" className="size-[11px]" fill="currentColor">
        <path d="M8 1.5c3.6 0 6.5 2.4 6.5 5.4S11.6 12.3 8 12.3c-.6 0-1.2-.1-1.7-.2L3 13.8l.7-2.6C2.3 10.3 1.5 8.7 1.5 6.9c0-3 2.9-5.4 6.5-5.4Z" />
      </svg>
      <span aria-hidden>{count}</span>
    </span>
  );
}
