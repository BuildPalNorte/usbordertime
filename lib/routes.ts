/** Paths the wallet shell owns. Card URLs are the CBP port number, so a share opens that crossing. */

export const EXPLORE_PATH = "/explore";

export function crossingPath(portNumber: string): string {
  return `/${portNumber}`;
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
  | { tab: "wallet"; port: null; known: false };

export function parseAppPath(pathname: string): AppRoute {
  if (pathname === "/") return { tab: "wallet", port: null, known: true };
  if (pathname === EXPLORE_PATH) return { tab: "browse", port: null, known: true };
  if (pathname.startsWith("/") && !pathname.slice(1).includes("/")) {
    const port = decodeURIComponent(pathname.slice(1));
    if (isPortParam(port)) return { tab: "wallet", port, known: true };
  }
  return { tab: "wallet", port: null, known: false };
}
