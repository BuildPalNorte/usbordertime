import { cacheLife } from "next/cache";

const CBP_WAIT_TIMES_URL = "https://bwt.cbp.gov/api/waittimes";

export const BORDERS = {
  canadian: "Canadian Border",
  mexican: "Mexican Border",
} as const;

export type Border = (typeof BORDERS)[keyof typeof BORDERS];

export type LaneReading = {
  operationalStatus: string;
  delayMinutes: number | null;
  lanesOpen: number | null;
  updateTime: string | null;
};

export type CommercialLanes = {
  maximumLanes: number | null;
  standard: LaneReading;
  fast: LaneReading;
};

export type PassengerLanes = {
  maximumLanes: number | null;
  standard: LaneReading;
  nexusSentri: LaneReading;
  ready: LaneReading;
};

export type PedestrianLanes = {
  maximumLanes: number | null;
  standard: LaneReading;
  ready: LaneReading;
};

export type PortWaitTime = {
  portNumber: string;
  border: string;
  portName: string;
  crossingName: string | null;
  hours: string;
  date: string;
  time: string;
  portStatus: string;
  constructionNotice: string | null;
  commercial: CommercialLanes;
  passenger: PassengerLanes;
  pedestrian: PedestrianLanes;
};

export type BorderWaitTimes = {
  fetchedAt: string;
  source: string;
  ports: PortWaitTime[];
};

export type WaitTimesQuery = {
  border: Border | null;
  port: string | null;
};

export class BorderWaitTimesError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BorderWaitTimesError";
  }
}

const EMPTY_LANE: LaneReading = {
  operationalStatus: "N/A",
  delayMinutes: null,
  lanesOpen: null,
  updateTime: null,
};

export async function getBorderWaitTimes(): Promise<BorderWaitTimes> {
  "use cache";
  cacheLife("minutes");

  const response = await fetch(CBP_WAIT_TIMES_URL, {
    headers: {
      Accept: "application/json",
      "User-Agent": "usbordertime",
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new BorderWaitTimesError(
      `CBP border wait times returned ${response.status}.`,
    );
  }

  const body: unknown = await response.json();
  if (!Array.isArray(body)) {
    throw new BorderWaitTimesError(
      "CBP border wait times returned an unexpected payload.",
    );
  }

  const ports = body.flatMap((entry) => {
    const port = normalizePort(entry);
    return port ? [port] : [];
  });

  if (ports.length === 0) {
    throw new BorderWaitTimesError(
      "CBP border wait times did not include any ports.",
    );
  }

  return {
    fetchedAt: new Date().toISOString(),
    source: CBP_WAIT_TIMES_URL,
    ports,
  };
}

export function parseWaitTimesQuery(params: {
  border: string | null;
  port: string | null;
}): { ok: true; query: WaitTimesQuery } | { ok: false; error: string } {
  const borderParam = params.border?.trim().toLowerCase() ?? "";
  let border: Border | null = null;

  if (borderParam) {
    if (borderParam !== "canadian" && borderParam !== "mexican") {
      return {
        ok: false,
        error: "border must be canadian or mexican.",
      };
    }
    border = BORDERS[borderParam];
  }

  const port = params.port?.trim() || null;
  return { ok: true, query: { border, port } };
}

export function filterPorts(
  ports: PortWaitTime[],
  query: WaitTimesQuery,
): PortWaitTime[] {
  const needle = query.port?.toLowerCase() ?? null;

  return ports.filter((port) => {
    if (query.border && port.border !== query.border) {
      return false;
    }
    if (!needle) {
      return true;
    }

    return (
      port.portNumber.toLowerCase().includes(needle) ||
      port.portName.toLowerCase().includes(needle) ||
      (port.crossingName?.toLowerCase().includes(needle) ?? false)
    );
  });
}

function normalizePort(entry: unknown): PortWaitTime | null {
  if (!isRecord(entry)) {
    return null;
  }

  const portNumber = readString(entry, "port_number");
  const portName = readString(entry, "port_name");
  if (!portNumber || !portName) {
    return null;
  }

  return {
    portNumber,
    border: readString(entry, "border"),
    portName,
    crossingName: emptyToNull(readString(entry, "crossing_name")),
    hours: readString(entry, "hours"),
    date: readString(entry, "date"),
    time: readString(entry, "time"),
    portStatus: readString(entry, "port_status"),
    constructionNotice: emptyToNull(readString(entry, "construction_notice")),
    commercial: normalizeCommercial(entry.commercial_vehicle_lanes),
    passenger: normalizePassenger(entry.passenger_vehicle_lanes),
    pedestrian: normalizePedestrian(entry.pedestrian_lanes),
  };
}

function normalizeCommercial(value: unknown): CommercialLanes {
  const group = isRecord(value) ? value : {};
  return {
    maximumLanes: parseCount(readString(group, "maximum_lanes")),
    standard: normalizeLane(group.standard_lanes),
    fast: normalizeLane(group.FAST_lanes),
  };
}

function normalizePassenger(value: unknown): PassengerLanes {
  const group = isRecord(value) ? value : {};
  return {
    maximumLanes: parseCount(readString(group, "maximum_lanes")),
    standard: normalizeLane(group.standard_lanes),
    nexusSentri: normalizeLane(group.NEXUS_SENTRI_lanes),
    ready: normalizeLane(group.ready_lanes),
  };
}

function normalizePedestrian(value: unknown): PedestrianLanes {
  const group = isRecord(value) ? value : {};
  return {
    maximumLanes: parseCount(readString(group, "maximum_lanes")),
    standard: normalizeLane(group.standard_lanes),
    ready: normalizeLane(group.ready_lanes),
  };
}

function normalizeLane(value: unknown): LaneReading {
  if (!isRecord(value)) {
    return EMPTY_LANE;
  }

  const operationalStatus = readString(value, "operational_status");
  return {
    operationalStatus: operationalStatus || "N/A",
    delayMinutes: parseCount(readString(value, "delay_minutes")),
    lanesOpen: parseCount(readString(value, "lanes_open")),
    updateTime: emptyToNull(readString(value, "update_time")),
  };
}

function parseCount(value: string): number | null {
  if (value === "" || value.toUpperCase() === "N/A") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function emptyToNull(value: string): string | null {
  return value === "" ? null : value;
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
