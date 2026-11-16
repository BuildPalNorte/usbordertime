import { describe, expect, it } from "vitest";
import { snippet } from "@/lib/check-in";

describe("snippet", () => {
  it("keeps a short message as written, on one line", () => {
    expect(snippet("Line is\n\n  moving   fast")).toBe("Line is moving fast");
  });

  it("cuts a long message and marks the cut", () => {
    const text = snippet("a".repeat(300), 20);
    expect([...text]).toHaveLength(20);
    expect(text.endsWith("…")).toBe(true);
  });

  it("counts characters, not UTF-16 units", () => {
    expect(snippet("🚗".repeat(10), 10)).toBe("🚗".repeat(10));
  });
});
