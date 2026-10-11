import { siteOrigin } from "@/lib/site";
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: ["/guides", "/es/guias", "/privacy"], disallow: ["/api/", "/og/"] },
    sitemap: `${siteOrigin()}/sitemap.xml`,
  };
}
