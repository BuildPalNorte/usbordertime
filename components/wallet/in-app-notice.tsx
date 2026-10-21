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
 * Shown in place of the Google button inside Facebook, Instagram, and TikTok's own browser.
 * Android gets a button that hands this exact address to the phone's browser. An iPhone has no
 * way for a page to leave an app's browser, so it gets the one gesture that does.
 */
export function InAppNotice({ browser }: { browser: InAppBrowser }) {
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
    <section
      aria-labelledby="in-app-title"
      className="mt-6 w-full max-w-sm rounded-3xl bg-surface p-5 text-left"
    >
      <h2 id="in-app-title" className="text-[17px] leading-tight font-semibold tracking-[-0.02em]">
        {copy.inAppTitle(IN_APP_LABEL[browser.app])}
      </h2>
      <p className="mt-2 text-[14px] leading-snug text-muted">{copy.inAppBody}</p>

      {intent ? (
        <a
          href={intent}
          onClick={() => haptic("selection")}
          className="relative mt-4 flex h-12 w-full items-center justify-center rounded-full bg-accent text-[16px] font-semibold text-accent-ink active:opacity-80"
        >
          <HapticPad />
          {copy.inAppOpen}
        </a>
      ) : (
        <ol className="mt-4 space-y-3">
          {copy.inAppStepsIos.map((step, index) => (
            <li key={step} className="flex items-start gap-3">
              <span
                aria-hidden
                className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-accent text-[13px] font-semibold text-accent-ink"
              >
                {index + 1}
              </span>
              <span className="text-[15px] leading-snug">{step}</span>
            </li>
          ))}
        </ol>
      )}

      <button
        type="button"
        onClick={() => void copyLink()}
        className="relative mt-3 h-10 w-full rounded-full text-[14px] font-medium text-muted active:opacity-60"
      >
        <HapticPad />
        <span role="status">{copied ? copy.inAppCopied : copy.inAppCopy}</span>
      </button>
    </section>
  );
}
