import { GUIDES, guideIndexPath, guidePath } from "@/lib/guides";
import { siteOrigin } from "@/lib/site";
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
    ...entry(guideIndexPath("en"), guideIndexPath("es")),
    ...GUIDES.flatMap((guide) => entry(guidePath("en", guide), guidePath("es", guide))),
    { url: abs("/privacy") },
  ];
}
