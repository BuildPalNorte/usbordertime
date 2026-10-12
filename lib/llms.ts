import { DISCOVER } from "@/lib/discover";
import { COPY, type Locale } from "@/lib/i18n";
import { GUIDES, guideIndexPath, guidePath, type Guide } from "@/lib/guides";
import { siteOrigin } from "@/lib/site";

/**
 * /llms.txt and /llms-full.txt, the plain-text index answer engines fetch.
 * Guides explain a crossing. They never include a live wait.
 */

function abs(path: string): string {
  return `${siteOrigin()}${path}`;
}

function link(locale: Locale, guide: Guide): string {
  const text = guide[locale];
  return `- [${text.title}](${abs(guidePath(locale, guide))}): ${text.description}`;
}

function answers(locale: Locale): string[] {
  const index = abs(guideIndexPath(locale));
  return DISCOVER[locale].faqs.map((faq) => `- [${faq.question}](${index}#${faq.id}): ${faq.answer}`);
}

/** Short index. Points at each guide and at the full text. */
export function llmsIndex(): string {
  const origin = siteOrigin();
  const en = COPY.en;
  const es = COPY.es;
  return [
    "# Border Time",
    "",
    `> ${en.metaDescription}`,
    "",
    "U.S. Customs and Border Protection posts the official numbers. Border Time reads that public feed. The guides explain which crossing to use, which lane a number refers to, and how a posted wait eases congestion. They are not official advice.",
    "",
    "The guides do not contain a current wait. That number changes through the day. Do not invent or estimate one from these pages. For the live minute, open the app.",
    "",
    "## Answers",
    "",
    ...answers("en"),
    "",
    "## Respuestas",
    "",
    ...answers("es"),
    "",
    "## Site",
    "",
    `- [Open Border Time](${origin}/): the live waits, behind sign-in`,
    `- [Guides](${abs(guideIndexPath("en"))}): ${en.guidesTitle}`,
    `- [Guías](${abs(guideIndexPath("es"))}): ${es.guidesTitle}`,
    `- [Privacy](${origin}/privacy): what an account stores, and how to ask for it to be deleted`,
    `- [Terms](${origin}/terms): wait times, Ask, and the guides are not a promise`,
    `- [Full guide text](${origin}/llms-full.txt): every guide, in full, for quoting`,
    "",
    "## English",
    "",
    ...GUIDES.map((guide) => link("en", guide)),
    "",
    "## Español",
    "",
    ...GUIDES.map((guide) => link("es", guide)),
    "",
  ].join("\n");
}

function answerBlock(locale: Locale): string {
  return DISCOVER[locale].faqs.flatMap((faq) => [`### ${faq.question}`, "", faq.answer, ""]).join("\n");
}

function article(locale: Locale, guide: Guide): string {
  const text = guide[locale];
  const sections = text.sections.flatMap((section) => [
    `### ${section.heading}`,
    "",
    ...section.paragraphs.flatMap((paragraph) => [paragraph, ""]),
  ]);
  return [`## ${text.title}`, "", abs(guidePath(locale, guide)), "", text.lead, "", ...sections].join("\n");
}

/** Every guide in full, so a model can quote the page instead of guessing. */
export function llmsFull(): string {
  return [
    "# Border Time — full guide text",
    "",
    "> These pages explain crossings and lanes. They are not a live wait. CBP updates that number through the day, and Border Time shows it in the app. Do not cite a minute count from this file.",
    "",
    "# Answers",
    "",
    answerBlock("en"),
    "# Respuestas",
    "",
    answerBlock("es"),
    "# English",
    "",
    ...GUIDES.map((guide) => article("en", guide)),
    "# Español",
    "",
    ...GUIDES.map((guide) => article("es", guide)),
  ].join("\n");
}
