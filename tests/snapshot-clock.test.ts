import { describe, expect, it } from "vitest";
import type { LaneReading, PortWaitTime } from "@/lib/border-wait-times";
import { formatViewerTime, snapshotInstant, viewerUpdatedAt } from "@/lib/snapshot-clock";

const EMPTY: LaneReading = {
  operationalStatus: "N/A",
  delayMinutes: null,
  lanesOpen: null,
  updateTime: null,
};

function port(date: string, time: string, updateTime: string | null): PortWaitTime {
  const lane: LaneReading = {
    operationalStatus: "delay",
    delayMinutes: 15,
    lanesOpen: 2,
    updateTime,
  };
  return {
    portNumber: "1",
    border: "Mexican Border",
    portName: "Test",
    crossingName: null,
    hours: "24 hrs/day",
    date,
    time,
    portStatus: "Open",
    constructionNotice: null,
    commercial: { maximumLanes: null, standard: EMPTY, fast: EMPTY },
    passenger: { maximumLanes: 4, standard: lane, nexusSentri: EMPTY, ready: EMPTY },
    pedestrian: { maximumLanes: null, standard: EMPTY, ready: EMPTY },
  };
}

describe("snapshotInstant", () => {
  it("reads an Eastern stamp as the same moment a Central viewer sees an hour earlier", () => {
    const instant = snapshotInstant([
      port("11/3/2026", "03:00:19", "At 3:00 am EST"),
    ]);

    expect(instant).not.toBeNull();
    expect(formatViewerTime(instant!, "en", "America/Chicago")).toBe("2:00 AM");
    expect(formatViewerTime(instant!, "en", "America/New_York")).toBe("3:00 AM");
    expect(formatViewerTime(instant!, "en", "America/Los_Angeles")).toBe("12:00 AM");
  });

  it("agrees across ports that publish the same snapshot in different zones", () => {
    const eastern = snapshotInstant([port("11/3/2026", "03:00:19", "At 3:00 am EST")]);
    const central = snapshotInstant([port("11/3/2026", "02:00:20", "At Midnight CST")]);
    const pacific = snapshotInstant([port("11/3/2026", "00:00:19", "At 12:00 am PST")]);

    expect(eastern?.toISOString()).toBe("2026-11-03T08:00:19.000Z");
    expect(central?.toISOString()).toBe("2026-11-03T08:00:20.000Z");
    expect(pacific?.toISOString()).toBe("2026-11-03T08:00:19.000Z");
  });

  it("keeps a coastal stamp when an earlier mountain row would slip an hour in summer", () => {
    const instant = snapshotInstant([
      port("7/15/2026", "12:00:00", "At 12:00 pm MST"),
      port("7/15/2026", "15:00:00", "At 3:00 pm EDT"),
    ]);

    expect(formatViewerTime(instant!, "en", "America/Chicago")).toBe("2:00 PM");
  });

  it("falls back to the fetch when no row names a zone", () => {
    const label = viewerUpdatedAt(
      {
        fetchedAt: "2026-11-03T08:05:00.000Z",
        ports: [port("11/3/2026", "03:00:19", null)],
      },
      "en",
      "America/Chicago",
    );

    expect(label).toBe("2:05 AM");
  });
});
