/**
 * Spotting the browser an app builds into itself (Facebook, Instagram, Messenger, TikTok).
 * Client-safe: it only reads a user-agent string.
 *
 * Those views keep their own cookies, cannot be added to the Home Screen, and cannot receive web
 * push. Google sign-in stays available. The sign-in screen suggests opening the page in the
 * phone's browser, where alerts and the Home Screen app work.
 */

export type InAppApp = "facebook" | "instagram" | "tiktok";

export type InAppBrowser = {
  app: InAppApp;
  platform: "android" | "ios" | "other";
};

/** The name shown in the notice. Brand names are not translated. */
export const IN_APP_LABEL: Record<InAppApp, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
};

function appOf(ua: string): InAppApp | null {
  // Messenger identifies itself with the same FB tokens as Facebook.
  if (/FBAN|FBAV|FB_IAB|FBIOS|FB4A|Messenger/i.test(ua)) return "facebook";
  if (/Instagram/i.test(ua)) return "instagram";
  if (/musical_ly|BytedanceWebview|TikTok/i.test(ua)) return "tiktok";
  return null;
}

export function detectInAppBrowser(ua: string): InAppBrowser | null {
  const app = appOf(ua);
  if (!app) return null;
  const platform = /Android/i.test(ua) ? "android" : /iPhone|iPad|iPod/i.test(ua) ? "ios" : "other";
  return { app, platform };
}

/**
 * An Android intent that hands this page to the phone's own browser. Only a tap should use it.
 * The browser it opens has no app token in its user-agent, so it cannot loop back here.
 * The fragment is dropped because an intent uses `#` for its own parts.
 */
export function browserIntentUrl(href: string): string | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const scheme = url.protocol.slice(0, -1);
  return `intent://${url.host}${url.pathname}${url.search}#Intent;scheme=${scheme};end`;
}
