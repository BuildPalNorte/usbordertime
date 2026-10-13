"use client";

import type { PortWaitTime } from "@/lib/border-wait-times";
import { LocationPrompt } from "./location-prompt";

const EMPTY_LANE = { operationalStatus: "N/A", delayMinutes: null, lanesOpen: null, updateTime: null };

function mockPort(portNumber: string, portName: string, crossingName: string | null): PortWaitTime {
  return {
    portNumber,
    border: "Mexican Border",
    portName,
    crossingName,
    hours: "24 hrs/day",
    date: "",
    time: "",
    portStatus: "Open",
    constructionNotice: null,
    commercial: { maximumLanes: null, standard: EMPTY_LANE, fast: EMPTY_LANE },
    passenger: { maximumLanes: null, standard: EMPTY_LANE, nexusSentri: EMPTY_LANE, ready: EMPTY_LANE },
    pedestrian: { maximumLanes: null, standard: EMPTY_LANE, ready: EMPTY_LANE },
  };
}

/** Brownsville plus its nearby sister city Progreso, so more than one city matches. */
const MOCK_PORTS: PortWaitTime[] = [
  mockPort("535504", "Brownsville", "Gateway"),
  mockPort("535501", "Brownsville", "B&M"),
  mockPort("535502", "Brownsville", "Veterans International"),
  mockPort("535503", "Brownsville", "Los Indios"),
  mockPort("230901", "Progreso", "Progreso International Bridge"),
  mockPort("230902", "Progreso", "Donna International Bridge"),
];

/** Brownsville, TX. Close enough to that fixture feed for `nearbyBridges` to match it. */
const MOCK_COORDS: GeolocationCoordinates = {
  latitude: 25.9,
  longitude: -97.5,
  accuracy: 10,
  altitude: null,
  altitudeAccuracy: null,
  heading: null,
  speed: null,
  toJSON() {
    return this;
  },
};

// Module scope, not an effect: this file is only ever loaded by the dev-only lab page, and
// patching before the first render means "Share my location" works on the very first click
// with no permission prompt. Idempotent, so React's dev double-invoke does not matter.
if (typeof navigator !== "undefined" && navigator.geolocation) {
  navigator.geolocation.getCurrentPosition = (success) => {
    success({ coords: MOCK_COORDS, timestamp: Date.now() } as GeolocationPosition);
  };
}

/**
 * Development only. Drives the real `LocationPrompt` with a stubbed `getCurrentPosition`
 * and a fixture feed, so the ask → locating → found animation can be watched without
 * Google sign-in or a real device location prompt. Clicking "Share my location" still
 * writes to this browser's `walletStore`/`pinStore` — that write is the thing being
 * previewed — so it leaves Brownsville and Progreso in whatever wallet this browser has.
 */
export function LocationLab() {
  return <LocationPrompt ports={MOCK_PORTS} />;
}
