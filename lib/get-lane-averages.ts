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
  const series = isRecord(day) ? seriesFromDay(day) : emptySeries();
  return { portNumber, date, ...series };
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

function seriesFromDay(day: Record<string, unknown>): Pick<LaneAverages, "hours" | "high"> {
  const passenger = slots(day.private_time_slots, "private_slot");
  const pedestrian = slots(day.pedestrain_time_slots, "pedestrain_slot");
  const commercial = slots(day.commercial_time_slots, "commercial_slot");
  const car = pair(passenger, "standard_lane_average_wait", "standard_lane_max_wait");
  const ready = pair(passenger, "ready_lane_average_wait", "ready_lane_max_wait");
  // Passenger SENTRI/NEXUS lives on the private graph's fast lane.
  const sentri = pair(passenger, "fast_lane_average_wait", "fast_lane_max_wait");
  const walk = pair(pedestrian, "standard_lane_average_wait", "standard_lane_max_wait");
  const truck = pair(commercial, "standard_lane_average_wait", "standard_lane_max_wait");
  const fast = pair(commercial, "fast_lane_average_wait", "fast_lane_max_wait");

  return {
    hours: {
      car: car.average,
      ready: ready.average,
      sentri: sentri.average,
      walk: walk.average,
      truck: truck.average,
      fast: fast.average,
    },
    high: {
      car: car.high,
      ready: ready.high,
      sentri: sentri.high,
      walk: walk.high,
      truck: truck.high,
      fast: fast.high,
    },
  };
}

function emptySeries(): Pick<LaneAverages, "hours" | "high"> {
  const blank = () => Object.fromEntries(MODE_IDS.map((mode) => [mode, blankDay()])) as LaneAverages["hours"];
  return { hours: blank(), high: blank() };
}

function slots(group: unknown, key: string): unknown[] {
  if (!isRecord(group)) return [];
  const list = group[key];
  return Array.isArray(list) ? list : [];
}

function pair(
  list: unknown[],
  averageKey: string,
  highKey: string,
): { average: (number | null)[]; high: (number | null)[] } {
  const average = blankDay();
  const high = blankDay();
  for (const slot of list) {
    if (!isRecord(slot)) continue;
    const hour = Number(readString(slot, "time"));
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) continue;
    average[hour] = readCount(slot[averageKey]);
    high[hour] = readCount(slot[highKey]);
  }
  return { average, high };
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
