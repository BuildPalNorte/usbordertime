import { describe, expect, it } from "vitest";
import { parseAnnouncementActive } from "@/lib/announcement";

describe("parseAnnouncementActive", () => {
  it("accepts an id with a boolean", () => {
    expect(parseAnnouncementActive({ id: "abc", active: false })).toEqual({ id: "abc", active: false });
  });

  it("rejects a missing id, a non-boolean flag, and non-objects", () => {
    expect(parseAnnouncementActive({ active: true })).toBeNull();
    expect(parseAnnouncementActive({ id: "", active: true })).toBeNull();
    expect(parseAnnouncementActive({ id: "abc", active: "no" })).toBeNull();
    expect(parseAnnouncementActive(null)).toBeNull();
  });
});
