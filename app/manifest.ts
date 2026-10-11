import { COPY } from "@/lib/i18n";
import { THEME_COLOR } from "@/lib/theme";
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Border Time",
    short_name: "Border Time",
    description: COPY.en.metaDescription,
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    // Installed phone apps stay upright. An expanded camera releases this at runtime.
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: THEME_COLOR.light,
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
