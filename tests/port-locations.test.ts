import { describe, expect, it } from "vitest";
import { nearbyBridges } from "@/lib/port-locations";
import type { PortWaitTime } from "@/lib/border-wait-times";

function port(portNumber: string, border: string, portName: string, crossingName: string | null): PortWaitTime {
  const emptyLane = { operationalStatus: "N/A", delayMinutes: null, lanesOpen: null, updateTime: null };
  return {
    portNumber,
    border,
    portName,
    crossingName,
    hours: "24 hrs/day",
    date: "",
    time: "",
    portStatus: "Open",
    constructionNotice: null,
    commercial: { maximumLanes: null, standard: emptyLane, fast: emptyLane },
    passenger: { maximumLanes: null, standard: emptyLane, nexusSentri: emptyLane, ready: emptyLane },
    pedestrian: { maximumLanes: null, standard: emptyLane, ready: emptyLane },
  };
}

const BROWNSVILLE_GATEWAY = port("535504", "Mexican Border", "Brownsville", "Gateway");
const BROWNSVILLE_BM = port("535501", "Mexican Border", "Brownsville", "B&M");
const PROGRESO = port("230901", "Mexican Border", "Progreso", "Progreso International Bridge");
const EL_PASO = port("240202", "Mexican Border", "El Paso", "Paso Del Norte (PDN)");
const UNKNOWN_CITY = port("999999", "Mexican Border", "Nowhereville", null);

describe("nearbyBridges", () => {
  it("picks the closest city and every crossing it has", () => {
    const found = nearbyBridges(
      [BROWNSVILLE_GATEWAY, BROWNSVILLE_BM, EL_PASO],
      { lat: 25.9, lng: -97.5 }, // Near Brownsville, TX.
    );
    expect(found?.cities.map((c) => c.city)).toEqual(["Brownsville"]);
    expect(found?.ports.map((p: PortWaitTime) => p.portNumber).sort()).toEqual(["535501", "535504"]);
  });

  it("also includes a sister city within the radius, not just the nearest one", () => {
    // Progreso sits about 30 miles from Brownsville — close enough to count as nearby.
    const found = nearbyBridges([BROWNSVILLE_GATEWAY, BROWNSVILLE_BM, PROGRESO, EL_PASO], {
      lat: 25.9,
      lng: -97.5,
    });
    expect(found?.cities.map((c) => c.city)).toEqual(["Brownsville", "Progreso"]);
    expect(found?.ports.map((p: PortWaitTime) => p.portNumber).sort()).toEqual([
      "230901",
      "535501",
      "535504",
    ]);
  });

  it("keeps the nearest city even when nothing is within the radius", () => {
    const found = nearbyBridges([EL_PASO], { lat: 25.9, lng: -97.5 }); // Hundreds of miles from El Paso.
    expect(found?.cities.map((c) => c.city)).toEqual(["El Paso"]);
  });

  it("skips a city with no known location", () => {
    const found = nearbyBridges([UNKNOWN_CITY], { lat: 25.9, lng: -97.5 });
    expect(found).toBeNull();
  });

  it("returns null for an empty feed", () => {
    expect(nearbyBridges([], { lat: 0, lng: 0 })).toBeNull();
  });
});
