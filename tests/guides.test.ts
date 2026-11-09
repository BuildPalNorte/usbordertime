import { describe, expect, it } from "vitest";
import { GUIDES, guideById } from "@/lib/guides";

describe("guides", () => {
  it("gives every guide a unique slug in each language", () => {
    for (const locale of ["en", "es"] as const) {
      const slugs = GUIDES.map((guide) => guide[locale].slug);
      expect(new Set(slugs).size).toBe(slugs.length);
      for (const guide of GUIDES) {
        expect(guide[locale].title.length).toBeGreaterThan(0);
        expect(guide[locale].sections.length).toBeGreaterThan(0);
      }
    }
  });

  it("points related links at guides that exist", () => {
    for (const guide of GUIDES) {
      expect(guide.related.length).toBeGreaterThan(0);
      for (const id of guide.related) {
        expect(guideById(id)?.id).toBe(id);
      }
    }
  });
});
