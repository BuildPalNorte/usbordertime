import { describe, expect, it } from "vitest";
import { COPY } from "@/lib/i18n";
import { TRAMITES_DOC_ICONS, TRAMITES_PATH_IDS } from "@/lib/tramites";

describe("tramites document pictures", () => {
  it("has one picture for every document in both languages", () => {
    for (const locale of ["en", "es"] as const) {
      for (const id of TRAMITES_PATH_IDS) {
        expect(TRAMITES_DOC_ICONS[id]).toHaveLength(COPY[locale].tramites.paths[id].docs.length);
      }
    }
  });
});
