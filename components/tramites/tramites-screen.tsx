"use client";

import { BrandLockup } from "@/components/wallet/brand-lockup";
import { useLocale } from "@/components/locale-provider";
import { TramitesAskBar } from "@/components/tramites/tramites-ask-bar";
import { LanguageSwitch } from "@/components/wallet/language-switch";
import { ThemeSwitch } from "@/components/wallet/theme-switch";
import { cn } from "@/lib/cn";
import { OFFICIAL_LINKS, TRAMITES_PATH_IDS, tramitesHref, tramitesPathFrom, type TramitesPathId } from "@/lib/tramites";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, type CSSProperties, type ReactNode } from "react";

/** Page-only palette: a trustworthy navy and the app's cobalt. Scoped so the wallet is untouched. */
const PALETTE = {
  "--t-ink": "#0b1b3f",
  "--t-blue": "#2b64f0",
  "--t-sky": "#9dc0ff",
  "--t-wash": "#eef3fe",
} as CSSProperties;

/** Film grain: fractal noise tile, laid over everything in the footer, logo included, so it reads as printed, not flat. */
const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='2.4 0 0 0 -0.7  2.4 0 0 0 -0.7  2.4 0 0 0 -0.7  0 0 0 0 0.55'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

const SKY = "linear-gradient(180deg, #1a4fcf 0%, #2f6fe8 45%, #5a96fb 80%, #7fb0ff 100%)";
const NIGHT =
  "radial-gradient(70% 80% at 85% 0%, rgba(58,118,242,0.55), transparent 60%), radial-gradient(60% 70% at 0% 100%, rgba(26,73,199,0.5), transparent 60%), linear-gradient(180deg, #0b1b3f 0%, #10306e 100%)";

const HEADLINE = "text-[34px] leading-[1] font-bold tracking-[-0.045em] text-balance sm:text-[52px]";

function Icon({ d, className }: { d: string; className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className={cn("size-4 shrink-0", className)} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}
const ARROW = "M5 11 11 5M6 5h5v5";
const RIGHT = "M3 8h10M9 4l4 4-4 4";
const DOWN = "M8 3v10M3.5 8.5 8 13l4.5-4.5";
const CHECK = "M3.5 8.5 6.5 11.5 12.5 4.5";
const PLUS = "M8 3v10M3 8h10";
const ERRAND_ICON: Record<TramitesPathId, string> = {
  first: "M8 2.5v11M2.5 8h11",
  card: "M2 4.5h12v7H2zM2 7h12M4.5 9.5h3",
  renewal: "M13 8a5 5 0 1 1-1.5-3.5M13 2.5v2.5h-2.5",
  lost: "M7 11.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM10.5 10.5l3 3",
};

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

/** Soft white clouds along the bottom of a sky panel. */
function Clouds() {
  return (
    <>
      <div aria-hidden className="tramites-float absolute -bottom-40 -left-24 -z-10 h-72 w-[55%] rounded-full bg-white/40 blur-3xl [--d:0.4s]" />
      <div aria-hidden className="tramites-float absolute -right-20 -bottom-24 -z-10 h-96 w-[60%] rounded-full bg-white/55 blur-3xl [--d:1.6s]" />
      <div aria-hidden className="tramites-float absolute right-[20%] bottom-[30%] -z-10 h-40 w-[35%] rounded-full bg-white/25 blur-3xl [--d:2.4s]" />
      <div aria-hidden className="absolute top-[8%] right-[6%] -z-10 h-32 w-[30%] rounded-full bg-white/20 blur-2xl" />
    </>
  );
}

function CheckDot({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("grid size-5 shrink-0 place-items-center rounded-full bg-[color:var(--t-blue)] text-white", className)}>
      <Icon d={CHECK} className="size-3" />
    </span>
  );
}

/** The hero's picture: a stylized card with the selected checklist floating over it. Decorative; the real checklist is below. */
function HeroVisual({ selected }: { selected: TramitesPathId }) {
  const { copy } = useLocale();
  const t = copy.tramites;
  const path = t.paths[selected];
  return (
    <div aria-hidden className="rise relative mx-auto aspect-[1/1.12] w-full max-w-[460px] sm:aspect-square" style={rise(3)}>
      <div className="tramites-float absolute top-0 right-0 w-[80%] [--d:0.8s] [--r:5deg]">
        <div className="relative aspect-[1.586] overflow-hidden rounded-[22px] p-5 text-white shadow-[0_40px_80px_-30px_rgba(5,20,70,0.8)] ring-1 ring-white/30" style={{ background: "linear-gradient(135deg, #0b1b3f 0%, #1a49c7 60%, #3a76f2 100%)" }}>
          <div className="absolute -top-10 -right-10 size-40 rounded-full bg-white/10 blur-xl" />
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-semibold tracking-[0.18em] text-white/70 uppercase">B1 / B2</span>
            <span className="h-7 w-9 rounded-md bg-gradient-to-br from-[#f6d88a] to-[#c99a3b] ring-1 ring-black/10" />
          </div>
          <div className="absolute inset-x-5 bottom-5">
            <p className="text-[20px] font-bold tracking-[-0.03em]">{t.paths.card.label}</p>
            <p className="mt-1 font-mono text-[13px] tracking-[0.2em] text-white/60">•••• •••• 2031</p>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 w-[72%] -rotate-2 rounded-[24px] bg-white p-4 text-[color:var(--t-ink)] shadow-[0_40px_90px_-30px_rgba(5,20,70,0.65)] sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-[color:var(--t-ink)]/50">{t.previewLabel}</p>
            <p className="truncate text-[16px] font-bold tracking-[-0.02em]">{path.label}</p>
          </div>
          <span className="shrink-0 rounded-full bg-[color:var(--t-wash)] px-2.5 py-1 font-mono text-[11px] font-semibold text-[color:var(--t-blue)]">
            {path.docs.length} {t.previewItems}
          </span>
        </div>
        <ul className="mt-3 space-y-1.5">
          {path.docs.slice(0, 3).map((doc) => (
            <li key={doc} className="flex items-center gap-2.5 rounded-xl bg-[color:var(--t-wash)] px-3 py-2 text-[12px] font-medium">
              <CheckDot />
              <span className="line-clamp-1">{doc}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-center text-[11px] font-medium text-[color:var(--t-ink)]/45">{t.previewMore(path.docs.length - 3)}</p>
      </div>

      <div className="tramites-float absolute top-[16%] left-0 hidden sm:flex items-center gap-2.5 rounded-2xl bg-white/95 px-3.5 py-2.5 text-[color:var(--t-ink)] shadow-[0_20px_50px_-20px_rgba(5,20,70,0.6)] backdrop-blur [--d:1.8s]">
        <span className="grid size-8 place-items-center rounded-full bg-[#16a34a] text-white">
          <Icon d={CHECK} className="size-4" />
        </span>
        <span>
          <span className="block text-[13px] font-semibold">DS-160</span>
          <span className="block text-[11px] text-[color:var(--t-ink)]/55">{t.ds160.body}</span>
        </span>
      </div>
    </div>
  );
}

export function TramitesScreen() {
  const { copy } = useLocale();
  const t = copy.tramites;
  const selected = tramitesPathFrom(useSearchParams().get("path"));
  const path = t.paths[selected];

  useEffect(() => {
    document.title = copy.pageTitle(t.metaTitle);
  }, [copy, t.metaTitle]);

  const nav = [
    { href: "#errands", label: t.navServices },
    { href: "#how", label: t.navHow },
    { href: "#faq", label: t.navFaq },
  ];
  const links = [
    { key: "ds160", href: OFFICIAL_LINKS.ds160, ...t.ds160 },
    { key: "appointment", href: OFFICIAL_LINKS.appointment, ...t.appointment },
    { key: "embassy", href: OFFICIAL_LINKS.embassy, ...t.embassy },
  ];
  const faqLinks = { fees: OFFICIAL_LINKS.fees, waitTimes: OFFICIAL_LINKS.waitTimes };

  return (
    <div style={PALETTE} className="min-h-[100dvh] scroll-smooth">
      <header className="sticky top-0 z-30 border-b border-line bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" aria-label={copy.brandName}>
            <BrandLockup />
          </Link>
          <nav aria-label={copy.brandName} className="hidden items-center gap-1 md:flex">
            {nav.map((item) => (
              <a key={item.href} href={item.href} className="rounded-full px-3.5 py-2 text-[14px] font-medium text-muted transition-colors hover:bg-surface hover:text-foreground">
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <a
              href="#checklist"
              className="hidden h-10 items-center rounded-full bg-foreground px-4 text-[14px] font-semibold text-background transition-transform active:scale-[0.97] sm:inline-flex"
            >
              {t.ctaPrimary}
            </a>
            <ThemeSwitch />
            <LanguageSwitch />
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="px-3 pt-3 sm:px-5">
          <div className="relative isolate mx-auto max-w-[1400px] overflow-hidden rounded-[32px] text-white sm:rounded-[44px]" style={{ background: SKY }}>
            <Clouds />
            <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pt-14 pb-12 sm:px-10 sm:pt-20 sm:pb-20 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rise" style={rise(1)}>
                <h1 className="text-[44px] leading-[0.95] font-bold tracking-[-0.055em] text-balance drop-shadow-[0_2px_20px_rgba(11,27,63,0.25)] sm:text-[72px]">
                  {t.title}
                </h1>
                <p className="mt-6 max-w-lg text-[17px] leading-relaxed text-white/90 text-pretty sm:text-[19px]">{t.lead}</p>
                <div className="mt-7">
                  <TramitesAskBar />
                </div>
                <div className="mt-7 flex flex-wrap gap-3">
                  <a
                    href="#checklist"
                    className="inline-flex h-13 items-center gap-2 rounded-full bg-[color:var(--t-ink)] px-6 text-[15px] font-semibold text-white shadow-[0_18px_40px_-16px_rgba(11,27,63,0.8)] transition-transform active:scale-[0.97]"
                  >
                    {t.ctaPrimary}
                    <Icon d={DOWN} />
                  </a>
                  <a
                    href="#how"
                    className="inline-flex h-13 items-center rounded-full bg-white/20 px-6 text-[15px] font-semibold ring-1 ring-white/40 backdrop-blur transition-colors hover:bg-white/30 active:scale-[0.97]"
                  >
                    {t.ctaSecondary}
                  </a>
                </div>
                <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
                  {t.trust.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-[14px] font-semibold">
                      <span className="grid size-5 place-items-center rounded-full bg-white text-[color:var(--t-blue)]">
                        <Icon d={CHECK} className="size-3" />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <HeroVisual selected={selected} />
            </div>
          </div>
        </section>

        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          {/* Errands */}
          <section id="errands" aria-labelledby="errands-title" className="scroll-mt-24 pt-24 sm:pt-32">
            <h2 id="errands-title" className={HEADLINE}>{t.servicesTitle}</h2>
            <p className="mt-4 max-w-md text-[17px] leading-relaxed text-muted">{t.servicesLead}</p>
            <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {TRAMITES_PATH_IDS.map((id) => {
                const errand = t.paths[id];
                return (
                  <li key={id}>
                    <Link
                      href={`${tramitesHref(id)}#checklist`}
                      className="group flex h-full flex-col overflow-hidden rounded-[28px] border border-line bg-surface transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-accent hover:shadow-[0_30px_60px_-30px_rgba(43,100,240,0.45)] active:scale-[0.98]"
                    >
                      <span className="relative isolate block h-36 overflow-hidden" style={{ background: SKY }}>
                        <span aria-hidden className="absolute -bottom-10 -left-6 -z-10 h-24 w-[80%] rounded-full bg-white/70 blur-2xl" />
                        <span aria-hidden className="absolute -right-6 -bottom-12 -z-10 h-24 w-[70%] rounded-full bg-white/50 blur-2xl" />
                        <span className="absolute top-4 left-4 grid size-11 place-items-center rounded-2xl bg-white text-[color:var(--t-blue)] shadow-[0_10px_30px_-10px_rgba(11,27,63,0.5)] transition-transform duration-300 group-hover:-rotate-6">
                          <Icon d={ERRAND_ICON[id]} className="size-5" />
                        </span>
                        <span className="absolute right-4 bottom-4 rounded-full bg-white/90 px-2.5 py-1 font-mono text-[11px] font-semibold text-[color:var(--t-blue)]">
                          {errand.docs.length} {t.previewItems}
                        </span>
                      </span>
                      <span className="flex flex-1 flex-col p-5">
                        <span className="block text-[19px] leading-tight font-semibold tracking-[-0.03em]">{errand.label}</span>
                        <span className="mt-1.5 block flex-1 text-[14px] leading-snug text-muted">{errand.blurb}</span>
                        <span className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-semibold text-accent">
                          {t.serviceCta}
                          <Icon d={RIGHT} className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        {/* How it works */}
        <section id="how" aria-labelledby="how-title" className="scroll-mt-24 px-3 pt-24 sm:px-5 sm:pt-32">
          <div className="mx-auto max-w-[1400px] rounded-[32px] bg-surface px-4 py-16 sm:rounded-[44px] sm:px-6 sm:py-24">
            <div className="mx-auto max-w-6xl">
              <h2 id="how-title" className={cn(HEADLINE, "mx-auto max-w-2xl text-center")}>{t.howTitle}</h2>
              <ol className="mt-12 grid gap-4 md:grid-cols-3">
                {t.steps.map((step, i) => (
                  <li key={step.title} className="flex flex-col rounded-[28px] bg-background p-6 shadow-[0_1px_0_rgba(0,0,0,0.04)] ring-1 ring-line">
                    <div aria-hidden className="flex h-32 items-center justify-center rounded-2xl bg-surface p-4">
                      {i === 0 ? (
                        <div className="grid w-full max-w-[220px] grid-cols-2 gap-1.5">
                          {TRAMITES_PATH_IDS.map((id, j) => (
                            <span key={id} className={cn("truncate rounded-full px-2.5 py-1.5 text-center text-[11px] font-semibold", j === 1 ? "bg-foreground text-background" : "bg-background text-muted")}>
                              {t.paths[id].label}
                            </span>
                          ))}
                        </div>
                      ) : i === 1 ? (
                        <div className="w-full max-w-[220px] space-y-1.5">
                          {t.paths.card.docs.slice(0, 3).map((doc) => (
                            <span key={doc} className="flex items-center gap-2 rounded-xl bg-background px-2.5 py-1.5 text-[11px] font-medium">
                              <CheckDot className="size-4" />
                              <span className="line-clamp-1">{doc}</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-2 rounded-full bg-[color:var(--t-blue)] px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_14px_30px_-12px_rgba(43,100,240,0.8)]">
                          {t.ds160.title}
                          <Icon d={ARROW} className="size-3.5" />
                        </span>
                      )}
                    </div>
                    <span className="mt-6 font-mono text-[13px] font-semibold text-accent">0{i + 1}</span>
                    <p className="mt-1 text-[19px] font-semibold tracking-[-0.03em]">{step.title}</p>
                    <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{step.body}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* The checklist: where a visit converts */}
        <section id="checklist" aria-labelledby="checklist-title" className="scroll-mt-20 px-3 pt-24 sm:px-5 sm:pt-32">
          <div className="relative isolate mx-auto max-w-[1400px] overflow-hidden rounded-[32px] text-white sm:rounded-[44px]" style={{ background: NIGHT }}>
            <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-10 sm:py-20 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
              <div>
                <h2 id="checklist-title" className={HEADLINE}>{t.chooseTitle}</h2>
                <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-white/65">{t.checklistLead}</p>
                <nav aria-label={t.chooseTitle} className="mt-8 grid grid-cols-2 gap-2">
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
                          "flex min-h-12 items-center gap-2.5 rounded-2xl px-3.5 py-2 text-[14px] leading-tight font-semibold transition-colors",
                          active ? "bg-white text-[color:var(--t-ink)]" : "bg-white/8 text-white/80 ring-1 ring-white/12 hover:bg-white/14",
                        )}
                      >
                        <Icon d={ERRAND_ICON[id]} className={active ? "text-[color:var(--t-blue)]" : "text-white/60"} />
                        <span>{t.paths[id].label}</span>
                      </Link>
                    );
                  })}
                </nav>
                <section aria-labelledby="stop-title" className="mt-8 rounded-2xl bg-white/6 p-5 ring-1 ring-white/12">
                  <h3 id="stop-title" className="flex items-center gap-2 text-[14px] font-semibold text-[#ffb1a3]">
                    <svg aria-hidden viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 2.5 18 16.5H2L10 2.5ZM10 8v3.5M10 14v.01" />
                    </svg>
                    {t.stopTitle}
                  </h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-white/65">{t.stopBody}</p>
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {t.stopItems.map((item) => (
                      <li key={item} className="rounded-full bg-white/8 px-2.5 py-1 text-[12px] text-white/80">{item}</li>
                    ))}
                  </ul>
                </section>
              </div>

              <div key={selected} className="rise rounded-[28px] bg-white p-6 text-[color:var(--t-ink)] shadow-[0_50px_110px_-35px_rgba(0,0,0,0.6)] sm:p-8" style={rise(1)}>
                <div className="flex items-start justify-between gap-4">
                  <p className="text-[28px] leading-tight font-bold tracking-[-0.04em]">{path.label}</p>
                  <span className="mt-1 shrink-0 rounded-full bg-[color:var(--t-wash)] px-3 py-1.5 font-mono text-[12px] font-semibold text-[color:var(--t-blue)]">
                    {path.docs.length} {t.previewItems}
                  </span>
                </div>
                <p className="mt-3 text-[15px] leading-relaxed text-pretty text-[color:var(--t-ink)]/65">{path.what}</p>
                <h3 className="mt-7 text-[17px] font-semibold tracking-[-0.02em]">{t.docsTitle}</h3>
                <ul className="mt-3 space-y-2">
                  {path.docs.map((doc) => (
                    <li key={doc} className="flex items-start gap-3 rounded-2xl bg-[color:var(--t-wash)] px-4 py-3 text-[15px] leading-snug font-medium">
                      <CheckDot className="mt-px size-6" />
                      <span className="pt-0.5">{doc}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-[13px] leading-relaxed text-[color:var(--t-ink)]/50">{t.docsNote}</p>

                <h3 className="mt-8 text-[17px] font-semibold tracking-[-0.02em]">{t.nextTitle}</h3>
                <ul className="mt-3 space-y-2">
                  {links.map((link, i) => (
                    <li key={link.key}>
                      <External
                        href={link.href}
                        className={cn(
                          "group flex items-center gap-4 rounded-2xl px-4 py-3.5 transition-[transform,background-color] active:scale-[0.99]",
                          i === 0 ? "bg-[color:var(--t-blue)] text-white hover:bg-[#2457d6]" : "bg-[color:var(--t-ink)]/[0.04] ring-1 ring-[color:var(--t-ink)]/8 hover:bg-[color:var(--t-ink)]/[0.07]",
                        )}
                      >
                        <span className={cn("font-mono text-[13px] font-semibold", i === 0 ? "text-white/70" : "text-[color:var(--t-blue)]")}>0{i + 1}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[15px] font-semibold">{link.title}</span>
                          <span className={cn("block text-[13px]", i === 0 ? "text-white/75" : "text-[color:var(--t-ink)]/55")}>{link.body}</span>
                        </span>
                        <Icon d={ARROW} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </External>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          {/* FAQ */}
          <section id="faq" aria-labelledby="faq-title" className="grid scroll-mt-24 gap-10 pt-24 sm:pt-32 lg:grid-cols-[0.8fr_1.2fr]">
            <h2 id="faq-title" className={HEADLINE}>{t.faqTitle}</h2>
            <div className="divide-y divide-line border-y border-line">
              {t.faq.map((item) => (
                <details key={item.q} className="group py-1">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[18px] font-semibold tracking-[-0.02em] [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface transition-transform duration-300 group-open:rotate-45">
                      <Icon d={PLUS} />
                    </span>
                  </summary>
                  <div className="pr-14 pb-6">
                    <p className="text-[15px] leading-relaxed text-muted">{item.a}</p>
                    {item.link ? (
                      <External href={faqLinks[item.link.to]} className="mt-3 inline-flex items-center gap-1.5 text-[14px] font-semibold text-accent">
                        {item.link.label}
                        <Icon d={ARROW} className="size-3.5" />
                      </External>
                    ) : null}
                  </div>
                </details>
              ))}
            </div>
          </section>
        </div>

        {/* Final call to action */}
        <section className="px-3 pt-24 sm:px-5 sm:pt-32">
          <div className="relative isolate mx-auto max-w-6xl overflow-hidden rounded-[32px] px-6 py-14 text-white sm:rounded-[40px] sm:px-12 sm:py-16" style={{ background: "linear-gradient(135deg, #1a49c7 0%, #2b64f0 55%, #4f8bff 100%)" }}>
            <div aria-hidden className="absolute -right-20 -bottom-24 -z-10 h-72 w-[60%] rounded-full bg-white/25 blur-3xl" />
            <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
              <div>
                <h2 className="text-[34px] leading-[1] font-bold tracking-[-0.045em] text-balance sm:text-[48px]">{t.finalTitle}</h2>
                <p className="mt-4 max-w-md text-[16px] leading-relaxed text-white/80">{t.finalBody}</p>
                <a
                  href="#checklist"
                  className="mt-8 inline-flex h-13 items-center gap-2 rounded-full bg-white px-6 text-[15px] font-semibold text-[color:var(--t-ink)] transition-transform active:scale-[0.97]"
                >
                  {t.ctaPrimary}
                  <Icon d={RIGHT} />
                </a>
              </div>
              <ol className="space-y-2.5 rounded-[24px] bg-white p-4 text-[color:var(--t-ink)] shadow-[0_40px_80px_-30px_rgba(5,20,70,0.6)] sm:p-5">
                {t.steps.map((step) => (
                  <li key={step.title} className="flex items-center gap-3 rounded-2xl bg-[color:var(--t-wash)] px-4 py-3.5 text-[15px] font-semibold">
                    <CheckDot className="size-6" />
                    {step.title}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>
      </main>

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
