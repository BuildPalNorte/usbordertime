import { GuideArticle, GuideArticleFallback } from "@/components/guides/guide-pages";
import { guideMetadata } from "@/lib/guide-metadata";
import { GUIDES, guideBySlug } from "@/lib/guides";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

export function generateStaticParams() {
  return GUIDES.map((guide) => ({ slug: guide.en.slug }));
}

export async function generateMetadata({ params }: PageProps<"/guides/[slug]">): Promise<Metadata> {
  const guide = guideBySlug("en", (await params).slug);
  return guide ? guideMetadata("en", guide) : {};
}

export default function GuidePage({ params }: PageProps<"/guides/[slug]">) {
  return (
    <Suspense fallback={<GuideArticleFallback locale="en" />}>
      <GuideBody params={params} />
    </Suspense>
  );
}

async function GuideBody({ params }: { params: PageProps<"/guides/[slug]">["params"] }) {
  const guide = guideBySlug("en", (await params).slug);
  if (!guide) notFound();
  return <GuideArticle locale="en" guide={guide} />;
}
