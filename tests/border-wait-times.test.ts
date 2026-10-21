import { describe, expect, it } from "vitest";
import { BorderWaitTimesError, normalizeWaitTimesBody } from "@/lib/border-wait-times";
import { portName } from "@/lib/ports";

function entry(portNumber: string, portName: string, crossingName: string) {
  return {
    port_number: portNumber,
    port_name: portName,
    crossing_name: crossingName,
    border: "Mexican Border",
    port_status: "Open",
  };
}

describe("normalizeWaitTimesBody", () => {
  it("keeps Brownsville B&M and drops the B&M Bridge row that does not post a wait", () => {
    const ports = normalizeWaitTimesBody([
      entry("230106", "B&M Bridge", "B&M Bridge"),
      entry("535501", "Brownsville", "B&M"),
      entry("535504", "Brownsville", "Gateway"),
    ]);

    expect(ports.map((port) => port.portNumber)).toEqual(["535501", "535504"]);
    expect(portName(ports[0]).title).toBe("Viejo");
    expect(portName(ports[0]).subtitle).toBe("Brownsville");
  });

  it("rejects a payload that is not a list of crossings", () => {
    expect(() => normalizeWaitTimesBody({ ports: [] })).toThrow(BorderWaitTimesError);
  });

  it("rejects a payload that normalizes to no crossings", () => {
    expect(() => normalizeWaitTimesBody([entry("230106", "B&M Bridge", "B&M Bridge")])).toThrow(
      BorderWaitTimesError,
    );
    expect(() => normalizeWaitTimesBody([{ port_name: "Brownsville" }])).toThrow(BorderWaitTimesError);
  });
});
