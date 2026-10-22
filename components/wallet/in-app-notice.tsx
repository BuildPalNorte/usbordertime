"use client";

import { useLocale } from "@/components/locale-provider";
import { haptic } from "@/lib/haptics";
import {
  browserIntentUrl,
  detectInAppBrowser,
  IN_APP_LABEL,
  type InAppBrowser,
} from "@/lib/in-app-browser";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import { HapticPad } from "./haptic-pad";

let cached: InAppBrowser | null | undefined;

function snapshot(): InAppBrowser | null {
  if (cached === undefined) cached = detectInAppBrowser(navigator.userAgent);
  return cached;
}

const subscribe = () => () => {};

/** The app's built-in browser this page is open in, or null. Always null on the server. */
export function useInAppBrowser(): InAppBrowser | null {
  return useSyncExternalStore(subscribe, snapshot, () => null);
}

/**
 * A suggestion beside Google sign-in inside Facebook, Instagram, and TikTok's own browser.
 * Android gets a link that hands this exact address to the phone's browser. An iPhone has no
 * way for a page to leave an app's browser, so the suggestion names the one gesture that does.
 */
export function InAppNotice({
  browser,
  titleId = "in-app-title",
  className,
}: {
  browser: InAppBrowser;
  titleId?: string;
  className?: string;
}) {
  const { copy } = useLocale();
  const [copied, setCopied] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const intent = browser.platform === "android" ? browserIntentUrl(window.location.href) : null;

  const copyLink = async () => {
    haptic("selection");
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      return;
    }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section aria-labelledby={titleId} className={cn("w-full max-w-[32ch] text-center", className)}>
      <h2 id={titleId} className="text-[15px] leading-snug font-semibold tracking-[-0.02em]">
        {copy.inAppTitle(IN_APP_LABEL[browser.app])}
      </h2>
      <p className="mt-1.5 text-[13px] leading-snug text-muted">{copy.inAppBody}</p>
      {browser.platform === "ios" ? (
        <p className="mt-1.5 text-[13px] leading-snug text-muted">{copy.inAppHintIos}</p>
      ) : null}
      <div className="mt-1 flex flex-wrap items-center justify-center gap-x-4">
        {intent ? (
          <a
            href={intent}
            onClick={() => haptic("selection")}
            className="relative inline-flex h-8 items-center text-[15px] font-semibold text-accent active:opacity-60"
          >
            <HapticPad />
            {copy.inAppOpen}
          </a>
        ) : null}
        <button
          type="button"
          onClick={() => void copyLink()}
          className="relative inline-flex h-8 items-center text-[14px] font-medium text-muted active:opacity-60"
        >
          <HapticPad />
          <span role="status">{copied ? copy.inAppCopied : copy.inAppCopy}</span>
        </button>
      </div>
    </section>
  );
}
