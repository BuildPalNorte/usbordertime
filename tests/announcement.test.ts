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

import { parseAnnouncementInput, parseScheduledFor } from "@/lib/announcement";

describe("scheduling", () => {
  const now = Date.parse("2026-11-10T12:00:00Z");

  it("accepts a time at least a minute ahead and rejects past or far-off ones", () => {
    expect(parseScheduledFor("2026-11-10T13:00:00Z", now)).toBe("2026-11-10T13:00:00.000Z");
    expect(parseScheduledFor("2026-11-10T12:00:30Z", now)).toBeNull();
    expect(parseScheduledFor("2028-01-01T00:00:00Z", now)).toBeNull();
    expect(parseScheduledFor("nope", now)).toBeNull();
  });

  it("rejects the whole input when scheduledFor is present but invalid", () => {
    expect(parseAnnouncementInput({ title: "a", body: "b", scheduledFor: "bad" })).toBeNull();
    expect(parseAnnouncementInput({ title: "a", body: "b" })?.scheduledFor).toBeNull();
  });
});
