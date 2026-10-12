import { crossingPreview } from "@/lib/crossing-preview";
import { COPY } from "@/lib/i18n";
import { inviteQuery, withInvite } from "@/lib/invite";
import { resolveLocale } from "@/lib/locale.server";
import { localeQuery } from "@/lib/routes";
import type { Metadata } from "next";

export const instant = false;

function first(value: string | string[] | undefined): string | null {
  if (typeof value === "string") return value;
  return Array.isArray(value) ? (value[0] ?? null) : null;
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<"/[port]">): Promise<Metadata> {
  const { port } = await params;
  const query = await searchParams;
  const fromLink = localeQuery(first(query.lang));
  const locale = fromLink ?? (await resolveLocale());
  const preview = await crossingPreview(port, first(query.lane), locale);
  const copy = COPY[locale];

  if (!preview) {
    return {
      title: { absolute: copy.pageTitle(copy.notFoundCrossing) },
      description: copy.notFoundBody,
    };
  }

  const { message, path, image } = preview;
  const sharedPath = withInvite(path, inviteQuery(first(query.from)));
  return {
    title: { absolute: copy.pageTitle(message.title) },
    description: message.text,
    openGraph: {
      title: message.title,
      description: message.text,
      url: sharedPath,
      siteName: "Border Time",
      type: "website",
      locale: locale === "es" ? "es_MX" : "en_US",
      images: [{ url: image, width: 1200, height: 630, alt: message.text }],
    },
    twitter: {
      card: "summary_large_image",
      title: message.title,
      description: message.text,
      images: [image],
    },
  };
}

export default function CrossingPage() {
  return null;
}
