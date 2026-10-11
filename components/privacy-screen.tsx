"use client";

import { useLocale } from "@/components/locale-provider";
import { LanguageSwitch } from "@/components/wallet/language-switch";
import { ThemeSwitch } from "@/components/wallet/theme-switch";
import Link from "next/link";
import { useEffect, type CSSProperties } from "react";

export function PrivacyScreen() {
  const { copy } = useLocale();

  useEffect(() => {
    document.title = copy.pageTitle(copy.privacyTitle);
  }, [copy]);

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
        <h1 className="text-[34px] leading-[1.05] font-bold tracking-[-0.04em]">{copy.privacyTitle}</h1>
        <p className="mt-3 text-[13px] font-medium text-muted">{copy.privacyUpdated}</p>
        <p className="mt-6 text-[16px] leading-relaxed">{copy.privacyLead}</p>

        {copy.privacySections.map((section) => (
          <section key={section.heading} className="mt-8">
            <h2 className="text-[17px] font-semibold tracking-[-0.02em]">{section.heading}</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">{section.body}</p>
          </section>
        ))}
      </article>
    </div>
  );
}
