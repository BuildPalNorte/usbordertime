import { describe, expect, it } from "vitest";
import { clientAddress, hashAddress } from "@/lib/throttle.server";

describe("clientAddress", () => {
  it("uses the first address the platform forwarded", () => {
    const list = new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.2, 10.0.0.3" });
    expect(clientAddress(list)).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip, then to unknown", () => {
    expect(clientAddress(new Headers({ "x-real-ip": " 198.51.100.4 " }))).toBe("198.51.100.4");
    expect(clientAddress(new Headers())).toBe("unknown");
  });
});

describe("hashAddress", () => {
  it("is stable, differs per address, and does not contain the address", () => {
    const a = hashAddress("203.0.113.7");
    expect(hashAddress("203.0.113.7")).toBe(a);
    expect(hashAddress("203.0.113.8")).not.toBe(a);
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(a).not.toContain("203");
  });
});
