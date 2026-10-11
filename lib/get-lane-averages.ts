import { cacheLife } from "next/cache";
import { BorderWaitTimesError, getBorderWaitTimes } from "@/lib/border-wait-times";
import type { LaneAverages } from "@/lib/lane-averages";
import { MODE_IDS } from "@/lib/ports";

const CROSSINGS_URL = "https://bwt.cbp.gov/api/bwtmodern/crossingslist";
const GRAPH_URL = "https://bwt.cbp.gov/api/bwtwaittimegraph";

/**
 * Usual wait, by hour, for each lane at one crossing.
 * The graph id is 8 digits. Its last 6 match `port_number` from the live feed.
 * On the passenger graph, SENTRI and NEXUS are stored as `fast_lane_*`.
 * Pedestrian slots use CBP's `pedestrain` spelling.
 */
export async function getLaneAverages(portNumber: string): Promise<LaneAverages | null> {
  "use cache";
  cacheLife("hours");

  const bwtId = (await crossingIds())[portNumber];
  if (!bwtId) return null;

  const date = await portDate(portNumber);
  const response = await fetch(`${GRAPH_URL}/${bwtId}/${date}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "usbordertime",
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new BorderWaitTimesError(`CBP wait-time graph returned ${response.status}.`);
  }

  const body: unknown = await response.json();
  const day = Array.isArray(body) ? body[0] : null;
  return {
    portNumber,
    date,
    hours: isRecord(day) ? hoursFromDay(day) : emptyHours(),
  };
}

async function crossingIds(): Promise<Record<string, string>> {
  "use cache";
  cacheLife("days");

  const response = await fetch(CROSSINGS_URL, {
    headers: {
      Accept: "application/json",
      "User-Agent": "usbordertime",
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new BorderWaitTimesError(`CBP crossings list returned ${response.status}.`);
  }

  const body = unwrapJson(await response.json());
  const crossings = isRecord(body) ? body.portCrossings : null;
  if (!Array.isArray(crossings)) {
    throw new BorderWaitTimesError("CBP crossings list returned an unexpected payload.");
  }

  const ids: Record<string, string> = {};
  for (const crossing of crossings) {
    if (!isRecord(crossing)) continue;
    const bwtId = readString(crossing, "bwtId");
    if (bwtId.length < 6) continue;
    ids[bwtId.slice(-6)] = bwtId;
  }
  return ids;
}

async function portDate(portNumber: string): Promise<string> {
  try {
    const snapshot = await getBorderWaitTimes();
    const port = snapshot.ports.find((item) => item.portNumber === portNumber);
    const parsed = port ? isoDate(port.date) : null;
    if (parsed) return parsed;
  } catch {
    // The live feed can be down while the usual wait is still worth showing.
  }
  return chicagoToday();
}

function hoursFromDay(day: Record<string, unknown>): LaneAverages["hours"] {
  const passenger = slots(day.private_time_slots, "private_slot");
  const pedestrian = slots(day.pedestrain_time_slots, "pedestrain_slot");
  const commercial = slots(day.commercial_time_slots, "commercial_slot");

  return {
    car: column(passenger, "standard_lane_average_wait"),
    ready: column(passenger, "ready_lane_average_wait"),
    // Passenger SENTRI/NEXUS lives on the private graph's fast lane.
    sentri: column(passenger, "fast_lane_average_wait"),
    walk: column(pedestrian, "standard_lane_average_wait"),
    truck: column(commercial, "standard_lane_average_wait"),
    fast: column(commercial, "fast_lane_average_wait"),
  };
}

function emptyHours(): LaneAverages["hours"] {
  return Object.fromEntries(MODE_IDS.map((mode) => [mode, blankDay()])) as LaneAverages["hours"];
}

function slots(group: unknown, key: string): unknown[] {
  if (!isRecord(group)) return [];
  const list = group[key];
  return Array.isArray(list) ? list : [];
}

function column(list: unknown[], key: string): (number | null)[] {
  const hours = blankDay();
  for (const slot of list) {
    if (!isRecord(slot)) continue;
    const hour = Number(readString(slot, "time"));
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) continue;
    hours[hour] = readCount(slot[key]);
  }
  return hours;
}

function blankDay(): (number | null)[] {
  return Array.from({ length: 24 }, () => null);
}

function readCount(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (text === "" || text.toUpperCase() === "N/A") return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function isoDate(value: string): string | null {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function chicagoToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function unwrapJson(body: unknown): unknown {
  if (typeof body !== "string") return body;
  try {
    return JSON.parse(body) as unknown;
  } catch {
    return null;
  }
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
