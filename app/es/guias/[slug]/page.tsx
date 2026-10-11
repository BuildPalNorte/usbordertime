import { GuideArticle, GuideArticleFallback } from "@/components/guides/guide-pages";
import { guideMetadata } from "@/lib/guide-metadata";
import { GUIDES, guideBySlug } from "@/lib/guides";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

export function generateStaticParams() {
  return GUIDES.map((guide) => ({ slug: guide.es.slug }));
}

export async function generateMetadata({ params }: PageProps<"/es/guias/[slug]">): Promise<Metadata> {
  const guide = guideBySlug("es", (await params).slug);
  return guide ? guideMetadata("es", guide) : {};
}

export default function GuiaPage({ params }: PageProps<"/es/guias/[slug]">) {
  return (
    <Suspense fallback={<GuideArticleFallback locale="es" />}>
      <GuiaBody params={params} />
    </Suspense>
  );
}

async function GuiaBody({ params }: { params: PageProps<"/es/guias/[slug]">["params"] }) {
  const guide = guideBySlug("es", (await params).slug);
  if (!guide) notFound();
  return <GuideArticle locale="es" guide={guide} />;
}
