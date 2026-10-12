"use client";

import { useLocale } from "@/components/locale-provider";
import { LanguageSwitch } from "@/components/wallet/language-switch";
import { ThemeSwitch } from "@/components/wallet/theme-switch";
import { CONTACT_EMAIL } from "@/lib/i18n";
import Link from "next/link";
import { useEffect, type CSSProperties, type ReactNode } from "react";

function LinkedBody({ text }: { text: string }) {
  const parts = text.split(CONTACT_EMAIL);
  if (parts.length === 1) return text;
  const nodes: ReactNode[] = [];
  parts.forEach((part, index) => {
    if (index > 0) {
      nodes.push(
        <a key={`mail-${index}`} href={`mailto:${CONTACT_EMAIL}`} className="text-foreground underline">
          {CONTACT_EMAIL}
        </a>,
      );
    }
    if (part) nodes.push(part);
  });
  return nodes;
}

export function LegalScreen({
  title,
  updated,
  lead,
  sections,
}: {
  title: string;
  updated: string;
  lead: string;
  sections: readonly { heading: string; body: string }[];
}) {
  const { copy } = useLocale();

  useEffect(() => {
    document.title = copy.pageTitle(title);
  }, [copy, title]);

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(3rem,env(safe-area-inset-bottom))] sm:px-6">
      <header className="flex items-center justify-between gap-3">
        <Link href="/" className="text-[15px] font-medium text-muted">
          {copy.back}
        </Link>
        <div className="flex gap-2">
          <ThemeSwitch />
          <LanguageSwitch />
        </div>
      </header>

      <article className="rise mt-10" style={{ "--i": 1 } as CSSProperties}>
        <h1 className="text-[34px] leading-[1.05] font-bold tracking-[-0.04em]">{title}</h1>
        <p className="mt-3 text-[13px] font-medium text-muted">{updated}</p>
        <p className="mt-6 text-[16px] leading-relaxed">{lead}</p>

        {sections.map((section) => (
          <section key={section.heading} className="mt-8">
            <h2 className="text-[17px] font-semibold tracking-[-0.02em]">{section.heading}</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">
              <LinkedBody text={section.body} />
            </p>
          </section>
        ))}

        <nav className="mt-10 flex gap-4 text-[15px] font-medium">
          <Link href="/privacy" className="text-muted">
            {copy.privacyPolicy}
          </Link>
          <Link href="/terms" className="text-muted">
            {copy.termsOfUse}
          </Link>
        </nav>
      </article>
    </div>
  );
}
