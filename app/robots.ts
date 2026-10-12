import { siteOrigin } from "@/lib/site";
import type { MetadataRoute } from "next";

/** Answer-engine crawlers. Allowed on the public guides and the plain-text index. */
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "anthropic-ai",
  "PerplexityBot",
  "Google-Extended",
  "Applebot-Extended",
  "Amazonbot",
  "Meta-ExternalAgent",
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
