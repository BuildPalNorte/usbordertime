import { describe, expect, it } from "vitest";
import { DISCOVER } from "@/lib/discover";
import { entityJsonLd, guideIndexJsonLd } from "@/lib/guide-schema";
import { llmsFull, llmsIndex } from "@/lib/llms";

describe("discover", () => {
  it("asks the same questions in both languages", () => {
    expect(DISCOVER.es.faqs.map((faq) => faq.id)).toEqual(DISCOVER.en.faqs.map((faq) => faq.id));
  });

  it("keeps a live wait out of the answers", () => {
    const text = [...DISCOVER.en.faqs, ...DISCOVER.es.faqs].map((faq) => faq.answer).join(" ");
    expect(text).not.toMatch(/\d+ minutes|\d+ minutos/);
  });
});

describe("llms index", () => {
  it("points each answer at the guides page that shows it", () => {
    const index = llmsIndex();
    for (const faq of DISCOVER.en.faqs) {
      expect(index).toContain(`/guides#${faq.id}`);
      expect(index).toContain(faq.question);
    }
    for (const faq of DISCOVER.es.faqs) {
      expect(index).toContain(`/es/guias#${faq.id}`);
      expect(index).toContain(faq.question);
    }
  });

  it("quotes the answers in the full text", () => {
    const full = llmsFull();
    expect(full).toContain(DISCOVER.en.faqs[0]?.answer);
    expect(full).toContain(DISCOVER.es.faqs[0]?.answer);
    expect(full).toContain("Do not cite a minute count");
  });
});

describe("schema", () => {
  it("describes Border Time as an app published by BuildPalNorte", () => {
    const graph = entityJsonLd()["@graph"] as { "@type": string; name?: string }[];
    expect(graph.map((node) => node["@type"])).toEqual(["Organization", "WebSite", "SoftwareApplication"]);
    expect(graph.map((node) => node.name)).toEqual(["BuildPalNorte", "Border Time", "Border Time"]);
  });

  it("repeats the visible questions on the guides index", () => {
    const graph = guideIndexJsonLd("en")["@graph"] as {
      "@type": string;
      mainEntity?: { name: string; acceptedAnswer?: { text: string } }[];
    }[];
    const faq = graph.find((node) => node["@type"] === "FAQPage");
    expect(faq?.mainEntity?.map((question) => question.name)).toEqual(DISCOVER.en.faqs.map((item) => item.question));
    expect(faq?.mainEntity?.map((question) => question.acceptedAnswer?.text)).toEqual(
      DISCOVER.en.faqs.map((item) => item.answer),
    );
  });
});
