import { siteOrigin } from "@/lib/site";
import type { MetadataRoute } from "next";

/**
 * Crawlers that build an answer from a fetched page, or that train a model later asked about border waits.
 * Googlebot and Bingbot already match `*`, and those indexes feed AI Overviews and Copilot.
 */
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Google-CloudVertexBot",
  "Applebot-Extended",
  "Amazonbot",
  "Meta-ExternalAgent",
  "Meta-ExternalFetcher",
  "CCBot",
  "Bytespider",
  "DuckAssistBot",
  "cohere-ai",
];

const PUBLIC = ["/", "/guides", "/es/guias", "/privacy", "/terms", "/llms.txt", "/llms-full.txt"];
const PRIVATE = ["/api/", "/og/", "/admin"];

export default function robots(): MetadataRoute.Robots {
  const origin = siteOrigin();
  return {
    rules: [
      { userAgent: "*", allow: PUBLIC, disallow: PRIVATE },
      ...AI_CRAWLERS.map((userAgent) => ({ userAgent, allow: PUBLIC, disallow: PRIVATE })),
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
