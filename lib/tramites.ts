/** Phase 1 of Trámites is information only. Nothing here is about the person reading it. */

export const TRAMITES_PATH = "/tramites";

export const TRAMITES_PATH_IDS = ["first", "card", "renewal", "lost"] as const;
export type TramitesPathId = (typeof TRAMITES_PATH_IDS)[number];

export const DEFAULT_TRAMITES_PATH: TramitesPathId = "first";

export function isTramitesPathId(value: string | null): value is TramitesPathId {
  return value !== null && (TRAMITES_PATH_IDS as readonly string[]).includes(value);
}

/** An unknown or missing `path` falls back to the first path. */
export function tramitesPathFrom(value: string | null): TramitesPathId {
  return isTramitesPathId(value) ? value : DEFAULT_TRAMITES_PATH;
}

export function tramitesHref(id: TramitesPathId): string {
  return `${TRAMITES_PATH}?path=${id}`;
}

/** Official sources only. Each opens in a new tab. */
export const OFFICIAL_LINKS = {
  ds160: "https://ceac.state.gov/genniv/",
  appointment: "https://ais.usvisa-info.com/es-mx/niv",
  embassy: "https://mx.usembassy.gov/visas/",
  fees: "https://travel.state.gov/content/travel/en/us-visas/visa-information-resources/fees/fees-visa-services.html",
  waitTimes:
    "https://travel.state.gov/content/travel/en/us-visas/visa-information-resources/global-visa-wait-times.html",
} as const;
