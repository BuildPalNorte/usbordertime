import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { centralDay } from "@/lib/admin-time";
import { AppOpens } from "@/components/admin/app-opens";
import {
  fillOpenDays,
  matchingOpenRange,
  openRangeIssue,
  parseAppOpens,
  parseOpenRange,
  recentOpenRange,
  shiftOpenDay,
} from "@/lib/app-opens";

describe("centralDay", () => {
  it("uses the Central calendar, including across the daylight-saving change", () => {
    expect(centralDay(new Date("2026-11-09T05:30:00Z"))).toBe("2026-11-08");
    expect(centralDay(new Date("2026-11-09T06:00:00Z"))).toBe("2026-11-09");
    expect(centralDay(new Date("2026-03-08T07:30:00Z"))).toBe("2026-03-08");
    expect(centralDay(new Date("2026-03-08T08:00:00Z"))).toBe("2026-03-08");
  });
});

describe("open ranges", () => {
  it("steps back whole calendar days, including into the previous month", () => {
    expect(shiftOpenDay("2026-03-01", -7)).toBe("2026-02-22");
    expect(recentOpenRange("2026-11-09", 7)).toEqual({ from: "2026-11-03", to: "2026-11-09" });
    expect(recentOpenRange("2026-11-09", 1)).toEqual({ from: "2026-11-09", to: "2026-11-09" });
  });

  it("rejects an inverted span, a bad day, and more than a year", () => {
    expect(openRangeIssue("2026-11-10", "2026-11-09")).toBe("The start has to be on or before the end.");
    expect(openRangeIssue("2026-02-31", "2026-03-01")).toBe("Pick a start and an end.");
    expect(openRangeIssue("2025-01-01", "2026-01-02")).toBe("Pick a year or less.");
    expect(parseOpenRange("2026-11-01", "2026-11-09")).toEqual({ from: "2026-11-01", to: "2026-11-09" });
    expect(parseOpenRange("nope", "2026-11-09")).toBeNull();
  });

  it("matches a preset only when it ends today", () => {
    expect(matchingOpenRange("2026-11-03", "2026-11-09", "2026-11-09")).toBe("7");
    expect(matchingOpenRange("2026-11-03", "2026-11-08", "2026-11-09")).toBeNull();
    expect(matchingOpenRange("2026-11-09", "2026-11-09", "2026-11-09")).toBe("today");
  });

  it("fills the days a span is missing", () => {
    expect(
      fillOpenDays("2026-11-01", "2026-11-03", [{ day: "2026-11-02", people: 2, opens: 4 }]),
    ).toEqual([
      { day: "2026-11-01", people: 0, opens: 0 },
      { day: "2026-11-02", people: 2, opens: 4 },
      { day: "2026-11-03", people: 0, opens: 0 },
    ]);
  });

  it("reads a span payload and rejects a broken one", () => {
    const body = {
      from: "2026-11-08",
      to: "2026-11-09",
      people: 3,
      opens: 5,
      days: [
        { day: "2026-11-08", people: 1, opens: 1 },
        { day: "2026-11-09", people: 3, opens: 4 },
      ],
    };
    expect(parseAppOpens(body)).toEqual(body);
    expect(parseAppOpens({ ...body, people: 1.5 })).toBeNull();
    expect(parseAppOpens({ ...body, days: [{ day: "yesterday", people: 1, opens: 1 }] })).toBeNull();
  });
});

describe("AppOpens", () => {
  it("shows unique accounts and every open for the span", () => {
    const html = renderToStaticMarkup(
      createElement(AppOpens, {
        now: Date.parse("2026-11-09T18:00:00Z"),
        initial: {
          from: "2026-11-03",
          to: "2026-11-09",
          people: 4,
          opens: 11,
          days: [
            { day: "2026-11-03", people: 1, opens: 1 },
            { day: "2026-11-04", people: 0, opens: 0 },
            { day: "2026-11-05", people: 2, opens: 3 },
            { day: "2026-11-06", people: 0, opens: 0 },
            { day: "2026-11-07", people: 1, opens: 2 },
            { day: "2026-11-08", people: 2, opens: 2 },
            { day: "2026-11-09", people: 1, opens: 3 },
          ],
        },
      }),
    );
    expect(html).toContain("Unique accounts");
    expect(html).toContain("Times opened");
    expect(html).toContain(">4<");
    expect(html).toContain(">11<");
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain("7 days");
    expect(html).toContain('value="2026-11-03"');
    expect(html).toContain('value="2026-11-09"');
  });
});
