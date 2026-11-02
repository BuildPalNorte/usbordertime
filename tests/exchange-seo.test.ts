import { describe, expect, it } from "vitest";
import { exchangeJsonLd } from "@/lib/exchange-seo";
import { COPY } from "@/lib/i18n";
import { llmsFull, llmsIndex } from "@/lib/llms";

describe("exchange seo", () => {
  it("describes the converter in both languages without a rate", () => {
    for (const locale of ["en", "es"] as const) {
      const data = exchangeJsonLd(locale);
      const text = JSON.stringify(data);
      expect(data.name).toBe(COPY[locale].exchangeSeoTitle);
      expect(data.description).toBe(COPY[locale].exchangeSeoDescription);
      expect(data.url).toMatch(/\/exchange$/);
      expect(text).not.toMatch(/\d+\.\d+/);
    }
  });

  it("tells answer engines where the converter is and not to cite a rate", () => {
    const index = llmsIndex();
    expect(index).toContain("/exchange");
    expect(index).toContain(COPY.en.exchangeSeoDescription);
    expect(index).toContain(COPY.es.exchangeSeoDescription);
    expect(index).toContain("Do not cite a rate from this file.");
    expect(llmsFull()).toContain("Do not cite a rate from this file.");
  });
});
