"use client";

import { BrandLockup } from "@/components/wallet/brand-lockup";
import { useLocale } from "@/components/locale-provider";
import { TramitesAskBar } from "@/components/tramites/tramites-ask-bar";
import { LanguageSwitch } from "@/components/wallet/language-switch";
import { ThemeSwitch } from "@/components/wallet/theme-switch";
import { cn } from "@/lib/cn";
import { OFFICIAL_LINKS, TRAMITES_PATH_IDS, tramitesHref, tramitesPathFrom } from "@/lib/tramites";
import { Libre_Baskerville } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

const serif = Libre_Baskerville({ subsets: ["latin"], weight: ["400"], style: ["normal", "italic"] });

/** Page-only palette. The page is always dark; the wallet is untouched. */
const PALETTE = {
  "--t-ink": "#0b1b3f",
  "--t-blue": "#2b64f0",
  "--t-sky": "#9dc0ff",
  "--t-wash": "#eef3fe",
  background: "#050608",
  color: "#fff",
} as CSSProperties;

/** Film grain: fractal noise tile, laid over everything in the footer, logo included, so it reads as printed, not flat. */
const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='2.4 0 0 0 -0.7  2.4 0 0 0 -0.7  2.4 0 0 0 -0.7  0 0 0 0 0.55'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

/** The deep blue glow that pours in from the top edge. */
const GLOW =
  "radial-gradient(60% 55% at 62% 0%, rgba(43,100,240,0.75), transparent 70%), radial-gradient(45% 45% at 20% 10%, rgba(26,73,199,0.45), transparent 70%), linear-gradient(180deg, #07122c 0%, #050608 100%)";
const CARD_GLOW =
  "radial-gradient(70% 90% at 60% 0%, rgba(43,100,240,0.55), transparent 70%), linear-gradient(180deg, #0a1636 0%, #070a14 100%)";

const SERIF = serif.className;
const H2 = `${SERIF} text-[28px] leading-[1.15] tracking-[-0.01em] text-balance sm:text-[38px]`;
const PILL =
  "inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full bg-white px-5 text-[14px] font-medium text-[#0b1b3f] transition-transform active:scale-[0.97]";

function Icon({ d, className }: { d: string; className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className={cn("size-4 shrink-0", className)} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}
const ARROW = "M5 11 11 5M6 5h5v5";
const RIGHT = "M3 8h10M9 4l4 4-4 4";
const CHEVRON = "M4 6.5 8 10.5l4-4";

function External({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  const { copy } = useLocale();
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
      <span className="sr-only"> ({copy.tramites.opensNewTab})</span>
    </a>
  );
}

function rise(i: number): CSSProperties {
  return { "--i": i } as CSSProperties;
}


export function TramitesScreen() {
  const { copy } = useLocale();
  const t = copy.tramites;
  const selected = tramitesPathFrom(useSearchParams().get("path"));
  const path = t.paths[selected];

  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.title = copy.pageTitle(t.metaTitle);
  }, [copy, t.metaTitle]);

  const links = [
    { key: "ds160", href: OFFICIAL_LINKS.ds160, ...t.ds160 },
    { key: "appointment", href: OFFICIAL_LINKS.appointment, ...t.appointment },
    { key: "embassy", href: OFFICIAL_LINKS.embassy, ...t.embassy },
  ];
  const faqLinks = { fees: OFFICIAL_LINKS.fees, waitTimes: OFFICIAL_LINKS.waitTimes };

  return (
    <div style={PALETTE} className="min-h-[100dvh] scroll-smooth">
      <header
        className={cn(
          "sticky top-[-0.5rem] z-30 -mb-16 pt-2 sm:top-[-1rem] sm:-mb-20 sm:pt-4 transition-[background-color,backdrop-filter] duration-300",
          scrolled ? "bg-[#050608]/75 backdrop-blur-xl" : "bg-transparent",
        )}
      >
        <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center justify-between gap-3 px-7 sm:h-16 sm:px-12">
          <Link href="/" aria-label={copy.brandName} className="text-white">
            <BrandLockup />
          </Link>
          <div className="flex items-center gap-2">
            <a href="#checklist" className="hidden h-8 items-center whitespace-nowrap rounded-full bg-white px-4 text-[12px] font-medium text-[#0b1b3f] transition-transform active:scale-[0.97] sm:inline-flex">
              {t.ctaPrimary}
            </a>
            <ThemeSwitch />
            <LanguageSwitch />
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1200px] px-2 pt-2 sm:px-4 sm:pt-4">
        {/* Hero */}
        <section className="relative isolate overflow-hidden rounded-[20px]" style={{ background: GLOW }}>
          <div className="rise mx-auto flex max-w-3xl flex-col items-center px-5 pt-20 pb-24 text-center sm:pt-28 sm:pb-32" style={rise(1)}>
            <h1 className={`${SERIF} text-[40px] leading-[1.1] tracking-[-0.02em] text-balance sm:text-[60px]`}>{t.title}</h1>
            <p className="mt-6 max-w-xl text-[14px] leading-relaxed text-white/75 text-pretty sm:text-[15px]">{t.lead}</p>
            <div className="mt-8 flex w-full justify-center">
              <TramitesAskBar />
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <a href="#checklist" className={PILL}>
                {t.ctaPrimary}
              </a>
              <a href="#how" className="inline-flex h-10 items-center rounded-full px-4 text-[14px] text-white/80 ring-1 ring-white/25 transition-colors hover:bg-white/10">
                {t.ctaSecondary}
              </a>
            </div>
          </div>
        </section>

        <div className="px-3 sm:px-8">
          {/* Errands */}
          <section id="errands" aria-labelledby="errands-title" className="scroll-mt-20 pt-24 sm:pt-40">
            <h2 id="errands-title" className={`${SERIF} max-w-3xl text-[28px] leading-[1.2] text-balance sm:text-[40px]`}>
              {t.servicesTitle}
              <span className="text-white/40"> {t.servicesLead}</span>
            </h2>
            <ul className="mt-16 grid gap-x-8 gap-y-10 border-t border-white/12 pt-8 sm:grid-cols-2 lg:grid-cols-4">
              {TRAMITES_PATH_IDS.map((id) => {
                const errand = t.paths[id];
                return (
                  <li key={id}>
                    <Link href={`${tramitesHref(id)}#checklist`} className="group block">
                      <span className={`${SERIF} block text-[18px] leading-tight`}>{errand.label}</span>
                      <span className="mt-3 block text-[12px] leading-relaxed text-white/60">{errand.blurb}</span>
                      <span className="mt-4 inline-flex items-center gap-1.5 text-[12px] text-white/90">
                        {t.serviceCta}
                        <Icon d={RIGHT} className="size-3 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* How it works */}
          <section id="how" aria-labelledby="how-title" className="scroll-mt-20 pt-24 sm:pt-40">
            <h2 id="how-title" className={`${H2} max-w-md`}>{t.howTitle}</h2>
            <ol className="mt-16 grid gap-x-8 gap-y-10 border-t border-white/12 pt-8 md:grid-cols-3">
              {t.steps.map((step, i) => (
                <li key={step.title}>
                  <span className="font-mono text-[11px] text-white/45">0{i + 1}</span>
                  <p className={`${SERIF} mt-3 text-[18px] leading-tight`}>{step.title}</p>
                  <p className="mt-3 max-w-xs text-[12px] leading-relaxed text-white/60">{step.body}</p>
                </li>
              ))}
            </ol>
          </section>

          {/* The checklist: where a visit converts */}
          <section id="checklist" aria-labelledby="checklist-title" className="scroll-mt-20 pt-24 sm:pt-40">
            <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
              <div>
                <h2 id="checklist-title" className={H2}>{t.chooseTitle}</h2>
                <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-white/60">{t.checklistLead}</p>
                <nav aria-label={t.chooseTitle} className="mt-8 flex flex-wrap gap-2">
                  {TRAMITES_PATH_IDS.map((id) => {
                    const active = id === selected;
                    return (
                      <Link
                        key={id}
                        href={tramitesHref(id)}
                        replace
                        scroll={false}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "inline-flex h-9 items-center rounded-full px-4 text-[13px] transition-colors",
                          active ? "bg-white font-medium text-[#0b1b3f]" : "text-white/75 ring-1 ring-white/20 hover:bg-white/10",
                        )}
                      >
                        {t.paths[id].label}
                      </Link>
                    );
                  })}
                </nav>
                <section aria-labelledby="stop-title" className="mt-10 border-t border-white/12 pt-5">
                  <h3 id="stop-title" className="text-[13px] text-[#ffb1a3]">{t.stopTitle}</h3>
                  <p className="mt-2 text-[12px] leading-relaxed text-white/60">{t.stopBody}</p>
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {t.stopItems.map((item) => (
                      <li key={item} className="rounded-full px-2.5 py-1 text-[11px] text-white/75 ring-1 ring-white/15">{item}</li>
                    ))}
                  </ul>
                </section>
              </div>

              <div key={selected} className="rise" style={rise(1)}>
                <div className="flex items-baseline justify-between gap-4 border-b border-white/12 pb-4">
                  <p className={`${SERIF} text-[22px] leading-tight`}>{path.label}</p>
                  <span className="shrink-0 font-mono text-[11px] text-white/50">
                    {path.docs.length} {t.previewItems}
                  </span>
                </div>
                <p className="mt-4 text-[13px] leading-relaxed text-pretty text-white/65">{path.what}</p>
                <ul className="mt-6 divide-y divide-white/10 border-y border-white/10">
                  {path.docs.map((doc) => (
                    <li key={doc} className="flex items-start gap-3 py-3 text-[13px] leading-snug text-white/85">
                      <Icon d="M3.5 8.5 6.5 11.5 12.5 4.5" className="mt-0.5 size-3.5 text-[color:var(--t-sky)]" />
                      <span>{doc}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-[11px] leading-relaxed text-white/45">{t.docsNote}</p>

                <h3 className={`${SERIF} mt-10 text-[18px]`}>{t.nextTitle}</h3>
                <ul className="mt-3 divide-y divide-white/10 border-y border-white/10">
                  {links.map((link, i) => (
                    <li key={link.key}>
                      <External href={link.href} className="group flex items-center gap-4 py-4 transition-colors hover:text-white">
                        <span className="font-mono text-[11px] text-white/45">0{i + 1}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[14px] text-white">{link.title}</span>
                          <span className="block text-[12px] text-white/55">{link.body}</span>
                        </span>
                        <Icon d={ARROW} className="text-white/60 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </External>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section id="faq" aria-labelledby="faq-title" className="scroll-mt-20 pt-24 sm:pt-40">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
              <h2 id="faq-title" className={`${H2} max-w-xs`}>{t.faqTitle}</h2>
              <div className="divide-y divide-white/10 border-y border-white/10">
                {t.faq.map((item) => (
                  <details key={item.q} className="group">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-4 text-[13px] text-white/90 [&::-webkit-details-marker]:hidden">
                      {item.q}
                      <Icon d={CHEVRON} className="size-3.5 text-white/60 transition-transform duration-300 group-open:rotate-180" />
                    </summary>
                    <div className="pr-8 pb-5">
                      <p className="text-[12px] leading-relaxed text-white/60">{item.a}</p>
                      {item.link ? (
                        <External href={faqLinks[item.link.to]} className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-white underline underline-offset-4">
                          {item.link.label}
                          <Icon d={ARROW} className="size-3" />
                        </External>
                      ) : null}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </section>

          {/* Final call to action */}
          <section className="pt-24 sm:pt-40">
            <div className="relative isolate overflow-hidden rounded-[20px] px-6 py-14 ring-1 ring-white/10 sm:px-12 sm:py-16" style={{ background: CARD_GLOW }}>
              <p className={`${SERIF} max-w-md text-[26px] leading-[1.25] text-balance sm:text-[32px]`}>{t.finalTitle}</p>
              <p className="mt-4 max-w-md text-[13px] leading-relaxed text-white/65">{t.finalBody}</p>
              <a href="#checklist" className={cn(PILL, "mt-10")}>
                {t.ctaPrimary}
              </a>
            </div>
          </section>
        </div>
      </div>

      <footer className="relative isolate mt-24 overflow-hidden bg-[color:var(--t-ink)] px-4 pt-20 pb-0 text-white sm:px-6 sm:pt-28">
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(45% 60% at 20% 120%, rgba(43,100,240,0.6), transparent 60%), radial-gradient(45% 55% at 85% 110%, rgba(157,192,255,0.28), transparent 65%)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-[0.08]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(80% 100% at 50% 100%, black, transparent)",
          }}
        />
        <div className="mx-auto max-w-6xl">
          <p className="max-w-3xl text-[28px] leading-[1.12] font-bold tracking-[-0.035em] text-balance sm:text-[44px]">
            {t.footerHeadline}
            <span className="text-white/45"> {t.footerHeadlineMuted}</span>
          </p>

          <div className="mt-12 flex flex-wrap items-end justify-between gap-8">
            <p className="max-w-xs text-[15px] leading-relaxed text-white/60">{t.fineprint}</p>
            <nav aria-label={copy.brandName} className="flex flex-wrap gap-2.5 text-[15px] font-semibold">
              <Link
                href="/"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-5 text-[color:var(--t-ink)] transition-transform active:scale-[0.97]"
              >
                {t.backToWaits}
                <Icon d={RIGHT} />
              </Link>
              <Link
                href="/privacy"
                className="inline-flex h-12 items-center rounded-full bg-white/10 px-5 text-white ring-1 ring-white/25 backdrop-blur transition-colors hover:bg-white/20 active:scale-[0.97]"
              >
                {copy.privacyPolicy}
              </Link>
              <Link
                href="/terms"
                className="inline-flex h-12 items-center rounded-full bg-white/10 px-5 text-white ring-1 ring-white/25 backdrop-blur transition-colors hover:bg-white/20 active:scale-[0.97]"
              >
                {copy.termsOfUse}
              </Link>
            </nav>
          </div>

          <div className="relative mt-14 sm:mt-20">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-[6%] -top-24 bottom-0 -z-10 rounded-full bg-[color:var(--t-blue)]/40 blur-[110px]"
            />
            <div className="aspect-[2424/720] select-none overflow-hidden">
              <Image
                src="/usbt-logo.svg"
                alt={copy.brandName}
                width={2424}
                height={1024}
                unoptimized
                className="h-auto w-full"
                style={{
                  maskImage: "linear-gradient(to bottom, #000 25%, rgba(0,0,0,0) 100%)",
                  WebkitMaskImage: "linear-gradient(to bottom, #000 25%, rgba(0,0,0,0) 100%)",
                }}
              />
            </div>
          </div>
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 opacity-[0.2]"
          style={{ backgroundImage: GRAIN, backgroundSize: "220px 220px" }}
        />
      </footer>
    </div>
  );
}
