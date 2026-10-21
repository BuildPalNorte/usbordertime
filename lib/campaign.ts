/**
 * A campaign link is `/?c=<slug>`. Client-safe: the cookie and the slug live here.
 * The row, and whether a slug is one an admin created, live in `lib/campaign.server.ts`.
 */

export const CAMPAIGN_PARAM = "c";
export const CAMPAIGN_COOKIE = "usbordertime.campaign";

/** Long enough to sign in after leaving the link. The privacy page states this same span. */
const CAMPAIGN_MAX_AGE = 60 * 60 * 24 * 30;

export const MAX_CAMPAIGN_NAME = 60;

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** A campaign code: 2–40 letters, digits, and single hyphens. */
export function isCampaignSlug(value: unknown): value is string {
  return typeof value === "string" && value.length >= 2 && value.length <= 40 && SLUG.test(value);
}

/** A campaign code from a query string or cookie, or null when it is not one. */
export function campaignQuery(value: string | null): string | null {
  return isCampaignSlug(value) ? value : null;
}

/**
 * The code a name would use in a link. Accents fold, everything else between words
 * becomes one hyphen. Null when that leaves nothing a link can carry.
 */
export function slugFromName(name: string): string | null {
  const slug = name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  return isCampaignSlug(slug) ? slug : null;
}

/** The name to store, or null when it is blank, too long, or would not make a code. */
export function campaignName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim().replace(/\s+/g, " ");
  if (!name || name.length > MAX_CAMPAIGN_NAME || !slugFromName(name)) return null;
  return name;
}

/** Home page with the campaign code. The origin is added where the link is copied. */
export function campaignPath(slug: string): string {
  return `/?${CAMPAIGN_PARAM}=${slug}`;
}

const COOKIE_PATTERN = new RegExp(`(?:^|; )${CAMPAIGN_COOKIE.replaceAll(".", "\\.")}=([^;]*)`);

function campaignCookie(): string | null {
  const match = document.cookie.match(COOKIE_PATTERN);
  return campaignQuery(match?.[1] ? decodeURIComponent(match[1]) : null);
}

/** Keeps the first campaign. A later link does not replace it. */
export function rememberCampaign(search: string): void {
  const slug = campaignQuery(new URLSearchParams(search).get(CAMPAIGN_PARAM));
  if (!slug || campaignCookie()) return;
  document.cookie = `${CAMPAIGN_COOKIE}=${slug}; Path=/; Max-Age=${CAMPAIGN_MAX_AGE}; SameSite=Lax`;
}

export function clearCampaignCookie(): void {
  document.cookie = `${CAMPAIGN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

/** Drops `c` from the address bar so a copied link does not keep carrying the campaign. */
export function dropCampaignParam(): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(CAMPAIGN_PARAM)) return;
  url.searchParams.delete(CAMPAIGN_PARAM);
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(window.history.state, "", next);
}

/** One campaign, with how many new accounts signed in from it and how many browsers opened it. */
export type Campaign = {
  slug: string;
  name: string;
  createdAt: string;
  users: number;
  opened: number;
};
