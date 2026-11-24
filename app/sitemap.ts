import { GUIDES, guideIndexPath, guidePath } from "@/lib/guides";
import { siteOrigin } from "@/lib/site";
import { TRAMITES_PATH } from "@/lib/tramites";
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteOrigin();
  const abs = (path: string) => `${origin}${path}`;

  const entry = (en: string, es: string): MetadataRoute.Sitemap =>
    [en, es].map((path) => ({
      url: abs(path),
      alternates: { languages: { en: abs(en), es: abs(es) } },
    }));

  return [
    { url: origin },
    { url: abs("/exchange") },
    {
      url: abs(TRAMITES_PATH),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...entry(guideIndexPath("en"), guideIndexPath("es")),
    ...GUIDES.flatMap((guide) => entry(guidePath("en", guide), guidePath("es", guide))),
    { url: abs("/privacy") },
    { url: abs("/terms") },
  ];
}
