/** Query and cookie that name who shared a link. Better Auth ids are 32 letters and digits. */

export const INVITE_PARAM = "from";
export const INVITE_COOKIE = "usbordertime.from";

/** Long enough to sign in after leaving the link. The privacy page states this same span. */
const INVITE_MAX_AGE = 60 * 60 * 24 * 30;

const USER_ID = /^[A-Za-z0-9]{32}$/;

export function isUserId(value: unknown): value is string {
  return typeof value === "string" && USER_ID.test(value);
}

/** A sharer id from a query string, or null when it is not an account id. */
export function inviteQuery(value: string | null): string | null {
  return isUserId(value) ? value : null;
}

/**
 * Adds the sharer's account id to a path a person sends.
 * Notification links stay without it: those open the same account.
 */
export function withInvite(path: string, userId: string | null | undefined): string {
  if (!isUserId(userId)) return path;
  const query = path.indexOf("?");
  const pathname = query === -1 ? path : path.slice(0, query);
  const params = new URLSearchParams(query === -1 ? "" : path.slice(query + 1));
  params.set(INVITE_PARAM, userId);
  return `${pathname}?${params.toString()}`;
}

const COOKIE_PATTERN = new RegExp(
  `(?:^|; )${INVITE_COOKIE.replaceAll(".", "\\.")}=([^;]*)`,
);

function inviteCookie(): string | null {
  const match = document.cookie.match(COOKIE_PATTERN);
  return inviteQuery(match?.[1] ? decodeURIComponent(match[1]) : null);
}

/** Keeps the first sharer. A later link does not replace it. */
export function rememberInvite(search: string): void {
  const from = inviteQuery(new URLSearchParams(search).get(INVITE_PARAM));
  if (!from || inviteCookie()) return;
  document.cookie = `${INVITE_COOKIE}=${from}; Path=/; Max-Age=${INVITE_MAX_AGE}; SameSite=Lax`;
}

export function clearInviteCookie(): void {
  document.cookie = `${INVITE_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

/** Drops `from` from the address bar so a copied link does not keep the previous sharer. */
export function dropInviteParam(): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(INVITE_PARAM)) return;
  url.searchParams.delete(INVITE_PARAM);
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(window.history.state, "", next);
}
