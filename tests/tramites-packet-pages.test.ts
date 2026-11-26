import { describe, expect, it } from "vitest";
import { COPY } from "@/lib/i18n";
import {
  PROFILE_FIELD_IDS,
  SECTION_FIELDS,
  SECTION_IDS,
  SECTION_PAGES,
  fieldDef,
  pageCount,
  pageFields,
} from "@/lib/tramites-packet";

describe("packet pages", () => {
  it("asks every question of a section on exactly one page", () => {
    for (const section of SECTION_IDS) {
      if (section === "docs") continue;
      const paged = SECTION_PAGES[section].flat();
      expect([...paged].sort()).toEqual([...SECTION_FIELDS[section]].sort());
      expect(new Set(paged).size).toBe(paged.length);
    }
  });

  it("has a title for every page in both languages", () => {
    for (const locale of ["en", "es"] as const) {
      for (const section of SECTION_IDS) {
        expect(COPY[locale].tramites.packet.pageTitles[section]).toHaveLength(pageCount(section));
      }
    }
  });

  it("never shows an empty page", () => {
    for (const section of SECTION_IDS) {
      for (const page of pageFields(section, {})) {
        if (section !== "docs") expect(page.length).toBeGreaterThan(0);
      }
      expect(pageFields(section, {})).toHaveLength(pageCount(section));
    }
  });

  it("only shares questions that are true for the person", () => {
    for (const id of PROFILE_FIELD_IDS) {
      const def = fieldDef(id);
      expect(def, id).toBeDefined();
      expect(def?.showIf, id).toBeUndefined();
    }
  });
});
