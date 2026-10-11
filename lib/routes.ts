import { isLocale, type Locale } from "@/lib/i18n";
import { isMode, type Mode } from "@/lib/ports";
import { MAX_SCHEDULE_PORTS } from "@/lib/schedule";

/** Paths the wallet shell owns. Card URLs are the CBP port number, so a share opens that crossing. */

export const EXPLORE_PATH = "/explore";
export const SCHEDULES_PATH = "/schedules";
export const ADMIN_PATH = "/admin";

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

/**
 * The bridges a schedule notification named. `mode` is the lane they share.
 * Null when the query named a lane this app does not use; the cards still show.
 */
export type RoutesFocus = { ports: string[]; mode: Mode | null };

/** Where a schedule notification opens: those bridges, full, one above the other. */
export function routesFocusPath(portNumbers: readonly string[], mode: Mode): string {
  return withRoutesFocus("/", { ports: focusPorts(portNumbers), mode });
}

/** Keeps a notification's bridges on the query while moving to `path`. */
export function withRoutesFocus(path: string, focus: RoutesFocus | null): string {
  if (!focus || focus.ports.length === 0) return path;
  const query = path.indexOf("?");
  const pathname = query === -1 ? path : path.slice(0, query);
  const params = new URLSearchParams({ routes: focus.ports.join(",") });
  if (focus.mode) params.set("lane", focus.mode);
  return `${pathname}?${params.toString()}`;
}

/** Null when the query names no real port. An unknown lane still returns the ports. */
export function parseRoutesFocus(routes: string | null, lane: string | null): RoutesFocus | null {
  const ports = focusPorts((routes ?? "").split(","));
  if (ports.length === 0) return null;
  return { ports, mode: laneQuery(lane) };
}

function focusPorts(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const ports: string[] = [];
  for (const value of values) {
    const port = value.trim();
    if (!isPortParam(port) || seen.has(port)) continue;
    seen.add(port);
    ports.push(port);
    if (ports.length >= MAX_SCHEDULE_PORTS) break;
  }
  return ports;
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
