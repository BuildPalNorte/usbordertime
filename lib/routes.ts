import { isLocale, type Locale } from "@/lib/i18n";
import { isMode, type Mode } from "@/lib/ports";

/** Paths the wallet shell owns. Card URLs are the CBP port number, so a share opens that crossing. */

export const EXPLORE_PATH = "/explore";
export const SCHEDULES_PATH = "/schedules";

export function crossingPath(portNumber: string): string {
  return `/${portNumber}`;
}

/** Opens that crossing on the shared lane, in the language the preview was written in. */
export function crossingSharePath(portNumber: string, mode: Mode, locale: Locale): string {
  const params = new URLSearchParams({ lane: mode, lang: locale });
  return `${crossingPath(portNumber)}?${params.toString()}`;
}

/** Preview image for a shared crossing. Same lane and language as the page. */
export function crossingImagePath(portNumber: string, mode: Mode, locale: Locale): string {
  const params = new URLSearchParams({ lane: mode, lang: locale });
  return `/og/${encodeURIComponent(portNumber)}?${params.toString()}`;
}

export function laneQuery(value: string | null): Mode | null {
  return isMode(value) ? value : null;
}

export function localeQuery(value: string | null): Locale | null {
  return isLocale(value) ? value : null;
}

/** Same-origin path Google should return to after sign-in, including a shared card. */
export function currentCallbackURL(): string {
  const path = `${window.location.pathname}${window.location.search}`;
  return path.startsWith("/") ? path : "/";
}

/** CBP port numbers are opaque: `230401`, `L01901`, `l24501`. */
export function isPortParam(value: string): boolean {
  return /^[A-Za-z0-9]{4,10}$/.test(value);
}

export type AppRoute =
  | { tab: "wallet"; port: string | null; known: true }
  | { tab: "browse"; port: null; known: true }
  | { tab: "schedules"; port: null; known: true }
  | { tab: "wallet"; port: null; known: false };

export function parseAppPath(pathname: string): AppRoute {
  if (pathname === "/") return { tab: "wallet", port: null, known: true };
  if (pathname === EXPLORE_PATH) return { tab: "browse", port: null, known: true };
  // Checked before the port rule below: "schedules" is shaped like a port number.
  if (pathname === SCHEDULES_PATH) return { tab: "schedules", port: null, known: true };
  if (pathname.startsWith("/") && !pathname.slice(1).includes("/")) {
    const port = decodeURIComponent(pathname.slice(1));
    if (isPortParam(port)) return { tab: "wallet", port, known: true };
  }
  return { tab: "wallet", port: null, known: false };
}
