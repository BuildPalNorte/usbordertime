import type { LaneReading, PortWaitTime } from "@/lib/border-wait-times";

/** Client-safe helpers for presenting CBP port data. No server imports here. */

export type Mode = "car" | "ready" | "sentri" | "walk" | "truck" | "fast";

export const MODE_IDS: readonly Mode[] = [
  "car",
  "ready",
  "sentri",
  "walk",
  "truck",
  "fast",
];

export function isMode(value: unknown): value is Mode {
  return typeof value === "string" && (MODE_IDS as readonly string[]).includes(value);
}

export function laneFor(port: PortWaitTime, mode: Mode): LaneReading {
  switch (mode) {
    case "car":
      return port.passenger.standard;
    case "ready":
      return port.passenger.ready;
    case "sentri":
      return port.passenger.nexusSentri;
    case "walk":
      return port.pedestrian.standard;
    case "truck":
      return port.commercial.standard;
    case "fast":
      return port.commercial.fast;
  }
}

function maxLanesFor(port: PortWaitTime, mode: Mode): number | null {
  if (mode === "walk") return port.pedestrian.maximumLanes;
  if (mode === "truck" || mode === "fast") return port.commercial.maximumLanes;
  return port.passenger.maximumLanes;
}

export type Tone = "clear" | "busy" | "slow" | "closed" | "unknown";

export const TONE_DOT: Record<Tone, string> = {
  clear: "bg-emerald-400",
  busy: "bg-amber-400",
  slow: "bg-rose-400",
  closed: "bg-zinc-400",
  unknown: "bg-zinc-400",
};

export type StatusKey = "closed" | "notOffered" | "lanesClosed" | "pending";

export type Reading = {
  tone: Tone;
  minutes: number | null;
  /** False when CBP does not publish this lane type at the crossing. */
  available: boolean;
  /** Why there is no minute count. Ignored when minutes is set. */
  statusKey: StatusKey;
  lanesOpen: number | null;
  maxLanes: number | null;
  reportedAt: string | null;
};

export function readLane(port: PortWaitTime, mode: Mode): Reading {
  const lane = laneFor(port, mode);
  const status = lane.operationalStatus.trim().toLowerCase();
  const base = {
    lanesOpen: lane.lanesOpen,
    maxLanes: maxLanesFor(port, mode),
    reportedAt: lane.updateTime?.replace(/^at\s+/i, "") ?? null,
  };

  if (port.portStatus && !/open/i.test(port.portStatus)) {
    return { ...base, tone: "closed", minutes: null, available: true, statusKey: "closed" };
  }
  if (status === "n/a") {
    return { ...base, tone: "unknown", minutes: null, available: false, statusKey: "notOffered" };
  }
  if (status === "lanes closed") {
    return { ...base, tone: "closed", minutes: null, available: true, statusKey: "lanesClosed" };
  }
  if (lane.delayMinutes === null) {
    return { ...base, tone: "unknown", minutes: null, available: true, statusKey: "pending" };
  }

  const minutes = lane.delayMinutes;
  const tone: Tone = minutes <= 15 ? "clear" : minutes <= 45 ? "busy" : "slow";
  return { ...base, tone, minutes, available: true, statusKey: "pending" };
}

/** The lane a newly added crossing should lead with. */
export function defaultMode(port: PortWaitTime): Mode {
  for (const mode of ["car", "walk", "truck"] as const) {
    if (laneFor(port, mode).operationalStatus.trim().toLowerCase() !== "n/a") {
      return mode;
    }
  }
  return "car";
}

/* ----------------------------- naming ----------------------------- */

const SMALL_WORDS = new Set(["of", "the", "and", "de", "del"]);

function tidy(raw: string | null): string {
  if (!raw) return "";
  let text = raw.trim().replace(/\s+/g, " ").replace(/\s+port of entry$/i, "");
  if (text === text.toUpperCase()) {
    text = text
      .toLowerCase()
      .split(" ")
      .map((word, index) => {
        if (word.length <= 3 && /[&]/.test(word)) return word.toUpperCase();
        if (index > 0 && SMALL_WORDS.has(word)) return word;
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(" ");
  }
  return text;
}

const GENERIC_CROSSINGS = new Set(["east", "west", "commercial", "passenger", "pedwest"]);

/** Names people use, keyed by tidied city and CBP crossing. */
const LOCAL_CROSSING: Record<string, string> = {
  "brownsville|veterans international": "De los tomates",
  "brownsville|b&m": "Viejo",
  "brownsville|gateway": "Nuevo",
};

/** Live HLS cameras, keyed the same way as LOCAL_CROSSING. */
const CROSSING_STREAM: Record<string, string> = {
  "brownsville|gateway":
    "https://s81.ipcamlive.com/streams/51bcyg8u6laxau7hi/stream.m3u8",
  "brownsville|b&m":
    "https://s90.ipcamlive.com/streams/5aormyelwpo5cdtxw/stream.m3u8",
};

export function crossingStream(port: PortWaitTime): string | null {
  const city = tidy(port.portName);
  const crossing = tidy(port.crossingName);
  if (!crossing) return null;
  return CROSSING_STREAM[`${city.toLowerCase()}|${crossing.toLowerCase()}`] ?? null;
}

function localCrossing(city: string, crossing: string): string {
  return LOCAL_CROSSING[`${city.toLowerCase()}|${crossing.toLowerCase()}`] ?? crossing;
}

export type PortName = {
  city: string;
  crossing: string | null;
  /** What a card or row leads with. */
  title: string;
  /** Context under the title. A region phrase when subtitleIsRegion is set, otherwise a city name. */
  subtitle: string;
  subtitleIsRegion: boolean;
};

export function portName(port: PortWaitTime): PortName {
  const city = tidy(port.portName);
  let crossing: string | null = tidy(port.crossingName) || null;
  if (crossing && crossing.toLowerCase() === city.toLowerCase()) crossing = null;
  if (crossing) crossing = localCrossing(city, crossing);

  const region = port.border.toLowerCase().includes("canad")
    ? "Canadian border"
    : "Mexican border";

  if (!crossing) return { city, crossing, title: city, subtitle: region, subtitleIsRegion: true };
  if (GENERIC_CROSSINGS.has(crossing.toLowerCase())) {
    return { city, crossing, title: `${city} ${crossing}`, subtitle: region, subtitleIsRegion: true };
  }
  const namedForCity = crossing.toLowerCase().includes(city.toLowerCase());
  return {
    city,
    crossing,
    title: crossing,
    subtitle: namedForCity ? region : city,
    subtitleIsRegion: namedForCity,
  };
}

/* ----------------------------- card art ----------------------------- */

export type Palette = {
  id: string;
  from: string;
  to: string;
  /** Text color family that reads on this card. */
  ink: "light" | "dark";
};

export const PALETTES: readonly Palette[] = [
  { id: "ink", from: "#2a3146", to: "#10131f", ink: "light" },
  { id: "pine", from: "#24604f", to: "#0e2a23", ink: "light" },
  { id: "cobalt", from: "#3263c4", to: "#172f66", ink: "light" },
  { id: "clay", from: "#a2553b", to: "#52261a", ink: "light" },
  { id: "teal", from: "#33707e", to: "#143038", ink: "light" },
  { id: "silver", from: "#dfe3ea", to: "#a7aebb", ink: "dark" },
  { id: "olive", from: "#66713a", to: "#2a3015", ink: "light" },
  { id: "wine", from: "#8a3447", to: "#3a1520", ink: "light" },
  { id: "steel", from: "#5a6b86", to: "#252e40", ink: "light" },
];

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function paletteFor(portNumber: string): Palette {
  return PALETTES[hash(portNumber) % PALETTES.length];
}

export function cardBackground(palette: Palette): string {
  return `linear-gradient(155deg, ${palette.from}, ${palette.to})`;
}

/* ----------------------------- gesture math ----------------------------- */

/** Where a flick would come to rest (Apple's deceleration projection). */
export function project(velocity: number, decelerationRate = 0.99): number {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}
