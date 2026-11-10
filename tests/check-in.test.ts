import { describe, expect, it } from "vitest";
import type { PortWaitTime } from "@/lib/border-wait-times";
import {
  checkPresence,
  cleanMessage,
  firstName,
  isJpeg,
  MAX_CHECK_IN_MESSAGE,
  minutesSince,
} from "@/lib/check-in";

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

const brownsville = port("535501", "Mexican Border", "Brownsville", "B&M Bridge");

describe("checkPresence", () => {
  it("accepts a rider in Matamoros, a mile or two from the Brownsville point", () => {
    const result = checkPresence(brownsville, { lat: 25.89, lng: -97.5 }, 25);
    expect(result.ok).toBe(true);
  });

  it("refuses a rider in another city and reports how far", () => {
    const result = checkPresence(brownsville, { lat: 29.7604, lng: -95.3698 }, 20);
    expect(result).toMatchObject({ ok: false, reason: "far" });
    if (!result.ok && result.reason === "far") expect(result.miles).toBeGreaterThan(250);
  });

  it("gives back some of a rough reading, but only some", () => {
    // About 8.4 miles north of the point: outside the radius alone, inside with a 1 km allowance.
    const edge = { lat: 25.914 + 8.4 / 69, lng: -97.4891 };
    expect(checkPresence(brownsville, edge, 10).ok).toBe(false);
    expect(checkPresence(brownsville, edge, 900).ok).toBe(true);
  });

  it("asks for another reading when the accuracy is useless", () => {
    expect(checkPresence(brownsville, { lat: 25.914, lng: -97.4891 }, 8000)).toEqual({
      ok: false,
      reason: "imprecise",
    });
    expect(checkPresence(brownsville, { lat: 25.914, lng: -97.4891 }, Number.NaN)).toEqual({
      ok: false,
      reason: "imprecise",
    });
  });

  it("will not guess for a city it cannot place", () => {
    const lost = port("999999", "Mexican Border", "Nowhere", null);
    expect(checkPresence(lost, { lat: 25.914, lng: -97.4891 }, 10)).toEqual({
      ok: false,
      reason: "unknown",
    });
  });
});

describe("cleanMessage", () => {
  it("trims, tightens blank runs, and drops an empty note", () => {
    expect(cleanMessage("  long line \n\n\n\n  moving  ")).toBe("long line \n\n  moving");
    expect(cleanMessage("   ")).toBeNull();
    expect(cleanMessage(42)).toBeNull();
  });

  it("cuts by characters, not by UTF-16 units", () => {
    const text = cleanMessage("🚗".repeat(MAX_CHECK_IN_MESSAGE + 20));
    expect([...(text ?? "")]).toHaveLength(MAX_CHECK_IN_MESSAGE);
  });
});

describe("isJpeg", () => {
  it("reads the magic bytes", () => {
    expect(isJpeg(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe(true);
    expect(isJpeg(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe(false);
    expect(isJpeg(new Uint8Array([]))).toBe(false);
  });
});

describe("firstName and minutesSince", () => {
  it("shows a first name only", () => {
    expect(firstName("Marisol Treviño Cantú")).toBe("Marisol");
    expect(firstName(null)).toBe("Rider");
    expect(firstName("   ")).toBe("Rider");
  });

  it("counts whole minutes and never goes negative", () => {
    const now = Date.parse("2026-11-10T12:00:00Z");
    expect(minutesSince("2026-11-10T11:47:30Z", now)).toBe(12);
    expect(minutesSince("2026-11-10T12:05:00Z", now)).toBe(0);
  });
});
