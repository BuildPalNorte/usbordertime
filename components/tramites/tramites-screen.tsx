"use client";

import { BrandLockup } from "@/components/wallet/brand-lockup";
import { useLocale } from "@/components/locale-provider";
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
  "--t-ink-2": "#13285c",
  "--t-blue": "#2b64f0",
  "--t-sky": "#9dc0ff",
  "--t-wash": "#eef3fe",
} as CSSProperties;

/** Film grain: fractal noise tile, laid over everything in the footer, logo included, so it reads as printed, not flat. */
const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='2.4 0 0 0 -0.7  2.4 0 0 0 -0.7  2.4 0 0 0 -0.7  0 0 0 0 0.55'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

const SECTION_TITLE = "text-[30px] leading-[1.05] font-bold tracking-[-0.04em] text-balance sm:text-[44px]";
const CARD_TITLE = "text-[17px] font-semibold tracking-[-0.02em]";

function Icon({ d, className }: { d: string; className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className={cn("size-4 shrink-0", className)} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}
const ARROW = "M5 11 11 5M6 5h5v5";
const CHECK = "M3.5 8.5 6.5 11.5 12.5 4.5";
const DOWN = "M8 3v10M3.5 8.5 8 13l4.5-4.5";

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

/** The hero's own errand picker. Each tab is a real link, so a share opens that checklist. */
function HeroCard({ selected }: { selected: TramitesPathId }) {
  const { copy } = useLocale();
  const t = copy.tramites;
  const path = t.paths[selected];
  return (
    <div className="rise relative" style={rise(3)}>
      <div
        aria-hidden
        className="absolute -inset-4 -z-10 rounded-[36px] bg-white/10 blur-2xl"
      />
      <div className="overflow-hidden rounded-[28px] bg-white text-[color:var(--t-ink)] shadow-[0_50px_110px_-35px_rgba(5,20,70,0.7)] ring-1 ring-white/50">
        <div className="flex gap-1 overflow-x-auto border-b border-[color:var(--t-ink)]/8 p-2 [scrollbar-width:none]">
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
                  "shrink-0 rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors",
                  active ? "bg-[color:var(--t-ink)] text-white" : "text-[color:var(--t-ink)]/55 hover:bg-[color:var(--t-wash)]",
                )}
              >
                {t.paths[id].label}
              </Link>
            );
          })}
        </div>
        <div key={selected} className="rise p-6" style={rise(1)}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-medium text-[color:var(--t-ink)]/50">{t.heroCardLabel}</p>
              <p className="text-[22px] leading-tight font-bold tracking-[-0.03em]">{path.label}</p>
            </div>
            <span className="rounded-full bg-[color:var(--t-wash)] px-3 py-1.5 font-mono text-[12px] font-semibold text-[color:var(--t-blue)]">
              {path.docs.length} {t.heroCardItems}
            </span>
          </div>
          <ul className="mt-5 space-y-2">
            {path.docs.slice(0, 4).map((doc) => (
              <li key={doc} className="flex items-center gap-3 rounded-2xl bg-[color:var(--t-wash)] px-3.5 py-3 text-[14px] font-medium">
                <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-full bg-[color:var(--t-blue)] text-white">
                  <Icon d={CHECK} className="size-3.5" />
                </span>
                <span className="line-clamp-1">{doc}</span>
              </li>
            ))}
          </ul>
          {path.docs.length > 4 ? (
            <p className="mt-3 text-center text-[13px] font-medium text-[color:var(--t-ink)]/45">
              {t.heroCardMore(path.docs.length - 4)}
            </p>
          ) : null}
        </div>
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
    { href: "#how", label: t.navHow },
    { href: "#choose", label: t.navChoose },
    { href: "#where", label: t.navWhere },
    { href: "#notice", label: t.navNotice },
  ];
  const links = [
    { key: "ds160", href: OFFICIAL_LINKS.ds160, ...t.ds160 },
    { key: "appointment", href: OFFICIAL_LINKS.appointment, ...t.appointment },
    { key: "embassy", href: OFFICIAL_LINKS.embassy, ...t.embassy },
  ];

  return (
    <div style={PALETTE} className="min-h-[100dvh] scroll-smooth">
      <header className="sticky top-0 z-30 border-b border-line bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" aria-label={copy.brandName}>
            <BrandLockup />
          </Link>
          <nav aria-label={t.navHow} className="hidden items-center gap-1 md:flex">
            {nav.map((item) => (
              <a key={item.href} href={item.href} className="rounded-full px-3.5 py-2 text-[14px] font-medium text-muted transition-colors hover:bg-surface hover:text-foreground">
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <a
              href="#choose"
              className="hidden h-10 items-center rounded-full bg-accent px-4 text-[14px] font-semibold text-accent-ink transition-transform active:scale-[0.97] sm:inline-flex"
            >
              {t.ctaChoose}
            </a>
            <ThemeSwitch />
            <LanguageSwitch />
          </div>
        </div>
        <nav aria-label={t.navHow} className="flex gap-2 overflow-x-auto px-4 pb-3 md:hidden [scrollbar-width:none]">
          {nav.map((item) => (
            <a key={item.href} href={item.href} className="shrink-0 rounded-full bg-surface px-3.5 py-1.5 text-[13px] font-medium">
              {item.label}
            </a>
          ))}
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="px-3 pt-3 sm:px-5">
          <div className="relative isolate mx-auto max-w-[1400px] overflow-hidden rounded-[32px] bg-[color:var(--t-ink)] text-white sm:rounded-[44px]">
            <div
              aria-hidden
              className="absolute inset-0 -z-10"
              style={{
                background:
                  "radial-gradient(80% 90% at 78% 8%, #3a76f2 0%, transparent 55%), radial-gradient(70% 80% at 12% 100%, #1a49c7 0%, transparent 60%), linear-gradient(180deg, #0b1b3f 0%, #10306e 100%)",
              }}
            />
            <div
              aria-hidden
              className="absolute inset-0 -z-10 opacity-[0.1]"
              style={{
                backgroundImage: "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
                backgroundSize: "60px 60px",
                maskImage: "radial-gradient(75% 75% at 30% 30%, black, transparent)",
              }}
            />
            {/* Soft clouds for depth */}
            <div aria-hidden className="tramites-float absolute -bottom-20 -left-16 -z-10 h-64 w-[55%] rounded-full bg-white/20 blur-3xl [--d:0.6s]" />
            <div aria-hidden className="tramites-float absolute -top-10 right-[6%] -z-10 h-56 w-[42%] rounded-full bg-white/18 blur-3xl [--d:1.4s]" />
            <div aria-hidden className="tramites-float absolute bottom-6 right-[26%] -z-10 h-40 w-[30%] rounded-full bg-white/12 blur-3xl [--d:2.2s]" />
            <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 pt-16 pb-14 sm:px-10 sm:pt-24 sm:pb-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
              <div className="rise" style={rise(1)}>
                <h1 className="text-[46px] leading-[0.95] font-bold tracking-[-0.055em] text-balance sm:text-[76px]">
                  {t.title}
                </h1>
                <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-white/75 text-pretty sm:text-[19px]">{t.lead}</p>
                <div className="mt-9 flex flex-wrap gap-3">
                  <a
                    href="#choose"
                    className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-[15px] font-semibold text-[color:var(--t-ink)] transition-transform active:scale-[0.97]"
                  >
                    {t.ctaChoose}
                    <Icon d={DOWN} />
                  </a>
                  <a
                    href="#where"
                    className="inline-flex h-12 items-center gap-2 rounded-full border border-white/25 px-6 text-[15px] font-semibold transition-colors hover:bg-white/10 active:scale-[0.97]"
                  >
                    {t.ctaOfficial}
                    <Icon d={ARROW} />
                  </a>
                </div>
                <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-6">
                  {t.stats.map((stat) => (
                    <div key={stat.label}>
                      <dt className="text-[32px] leading-none font-bold tracking-[-0.05em] sm:text-[40px]">{stat.value}</dt>
                      <dd className="mt-1.5 max-w-[10rem] text-[12px] leading-snug text-white/65 sm:text-[13px]">{stat.label}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <HeroCard selected={selected} />
            </div>
          </div>
        </section>

        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          {/* How it works */}
          <section id="how" aria-labelledby="how-title" className="scroll-mt-28 pt-24">
            <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
              <div>
                <h2 id="how-title" className={SECTION_TITLE}>{t.processTitle}</h2>
                <p className="mt-4 max-w-sm text-[16px] leading-relaxed text-muted">{t.processLead}</p>
              </div>
              <ol className="grid gap-3 sm:grid-cols-2">
                {t.steps.map((step, i) => (
                  <li key={step.title} className="rounded-3xl border border-line bg-surface p-6">
                    <span className="grid size-11 place-items-center rounded-2xl bg-accent/12 font-mono text-[15px] font-semibold text-accent">
                      {i + 1}
                    </span>
                    <p className={cn(CARD_TITLE, "mt-4")}>{step.title}</p>
                    <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{step.body}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* The stop */}
          <section aria-labelledby="stop-title" className="mt-20 rounded-3xl border border-danger/30 bg-danger/[0.06] p-6 sm:p-9">
            <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:gap-12">
              <div>
                <h2 id="stop-title" className="flex items-center gap-2.5 text-[20px] font-semibold tracking-[-0.025em] text-danger">
                  <svg aria-hidden viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 2.5 18 16.5H2L10 2.5ZM10 8v3.5M10 14v.01" />
                  </svg>
                  {t.stopTitle}
                </h2>
                <p className="mt-3 text-[15px] leading-relaxed">{t.stopBody}</p>
                <p className="mt-4 text-[14px] leading-relaxed text-muted">{t.stopClosing}</p>
              </div>
              <ul className="grid content-start gap-2.5">
                {t.stopItems.map((item) => (
                  <li key={item} className="flex items-center gap-3 rounded-2xl bg-background/60 px-4 py-3 text-[15px] font-medium">
                    <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-danger" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Choose + checklist */}
          <section id="choose" aria-labelledby="choose-title" className="scroll-mt-28 pt-24">
            <h2 id="choose-title" className={SECTION_TITLE}>{t.chooseTitle}</h2>
            <p className="mt-3 text-[15px] text-muted">{t.chooseHint}</p>
            <nav aria-label={t.chooseTitle} className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                      "group relative flex min-h-[140px] flex-col justify-between rounded-3xl border p-5 transition-[transform,background-color,border-color] duration-200 active:scale-[0.98]",
                      active
                        ? "border-transparent bg-[color:var(--t-ink)] text-white"
                        : "border-line bg-surface hover:-translate-y-0.5 hover:border-accent",
                    )}
                  >
                    <span className="flex items-center justify-between">
                      <span
                        aria-hidden
                        className={cn(
                          "grid size-9 place-items-center rounded-2xl transition-colors",
                          active ? "bg-accent text-accent-ink" : "bg-accent/12 text-accent group-hover:bg-accent group-hover:text-accent-ink",
                        )}
                      >
                        <Icon d={CHECK} className="size-4" />
                      </span>
                      <span
                        aria-hidden
                        className={cn(
                          "size-2 rounded-full transition-opacity",
                          active ? "bg-[color:var(--t-sky)] opacity-100" : "opacity-0",
                        )}
                      />
                    </span>
                    <span>
                      <span className="block text-[19px] leading-tight font-semibold tracking-[-0.03em]">{t.paths[id].label}</span>
                      <span className={cn("mt-1 block text-[13px] leading-snug", active ? "text-white/70" : "text-muted")}>{t.paths[id].blurb}</span>
                    </span>
                  </Link>
                );
              })}
            </nav>

            <div key={selected} className="rise mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]" style={rise(1)}>
              <section aria-labelledby="what-title" className="rounded-3xl bg-[color:var(--t-wash)] p-6 text-[color:var(--t-ink)] sm:p-9">
                <h2 id="what-title" className="text-[15px] font-semibold tracking-[-0.01em] text-[color:var(--t-ink)]/55">{t.whatTitle}</h2>
                <p className="mt-2 text-[30px] leading-tight font-bold tracking-[-0.04em]">{path.label}</p>
                <p className="mt-4 text-[16px] leading-relaxed text-pretty text-[color:var(--t-ink)]/80">{path.what}</p>
              </section>
              <section aria-labelledby="docs-title" className="rounded-3xl border border-line bg-surface p-6 sm:p-9">
                <h2 id="docs-title" className={CARD_TITLE}>{t.docsTitle}</h2>
                <ol className="mt-5 space-y-3">
                  {path.docs.map((doc) => (
                    <li key={doc} className="flex items-start gap-3.5 text-[15px] leading-snug">
                      <span aria-hidden className="mt-px grid size-6 shrink-0 place-items-center rounded-full bg-accent/12 text-accent">
                        <Icon d={CHECK} className="size-3.5" />
                      </span>
                      {doc}
                    </li>
                  ))}
                </ol>
                <p className="mt-6 border-t border-line pt-4 text-[13px] leading-relaxed text-muted">{t.docsNote}</p>
              </section>
            </div>
          </section>

          {/* Official links */}
          <section id="where" aria-labelledby="where-title" className="scroll-mt-28 pt-24">
            <h2 id="where-title" className={SECTION_TITLE}>{t.whereTitle}</h2>
            <p className="mt-3 text-[15px] text-muted">{t.whereLead}</p>
            <div className="mt-7 grid gap-3 md:grid-cols-3">
              {links.map((link) => (
                <External
                  key={link.key}
                  href={link.href}
                  className="group flex min-h-[190px] flex-col justify-between rounded-3xl border border-line bg-surface p-6 transition-[transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-accent active:scale-[0.98]"
                >
                  <span className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-semibold tracking-[0.04em] text-accent uppercase">
                      {t.officialTag}
                    </span>
                    <span className="grid size-9 place-items-center rounded-full bg-accent/12 text-accent transition-transform group-hover:rotate-12 group-hover:bg-accent group-hover:text-accent-ink">
                      <Icon d={ARROW} />
                    </span>
                  </span>
                  <span>
                    <span className="block text-[19px] leading-tight font-semibold tracking-[-0.03em]">{link.title}</span>
                    <span className="mt-2 block text-[14px] leading-snug text-muted">{link.body}</span>
                  </span>
                </External>
              ))}
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <section aria-labelledby="fee-title" className="flex flex-col rounded-3xl border border-line bg-surface p-6 sm:p-9">
                <h2 id="fee-title" className={CARD_TITLE}>{t.feeTitle}</h2>
                <p className="mt-3 text-[24px] leading-tight font-bold tracking-[-0.035em]">{t.feeName}</p>
                <p className="mt-3 flex-1 text-[15px] leading-relaxed text-muted">{t.feeBody}</p>
                <External
                  href={OFFICIAL_LINKS.fees}
                  className="mt-6 inline-flex h-11 items-center gap-2 self-start rounded-full bg-foreground px-5 text-[14px] font-semibold text-background transition-transform active:scale-[0.97]"
                >
                  {t.feeLink}
                  <Icon d={ARROW} />
                </External>
              </section>
              <section aria-labelledby="wait-title" className="relative flex flex-col overflow-hidden rounded-3xl bg-[color:var(--t-ink)] p-6 text-white sm:p-9">
                <div
                  aria-hidden
                  className="absolute inset-0 -z-10"
                  style={{ background: "radial-gradient(60% 80% at 100% 0%, rgba(43,100,240,0.5), transparent 60%)" }}
                />
                <h2 className={cn(CARD_TITLE, "text-white/70")}>{t.waitTitle}</h2>
                <p className="mt-3 flex-1 text-[18px] leading-relaxed text-white/90">{t.waitBody}</p>
                <External
                  href={OFFICIAL_LINKS.waitTimes}
                  className="mt-6 inline-flex h-11 items-center gap-2 self-start rounded-full bg-white px-5 text-[14px] font-semibold text-[color:var(--t-ink)] transition-transform active:scale-[0.97]"
                >
                  {t.waitLink}
                  <Icon d={ARROW} />
                </External>
              </section>
            </div>
          </section>

          {/* Notice */}
          <aside id="notice" aria-labelledby="notice-title" className="scroll-mt-28 pt-24">
            <h2 id="notice-title" className={SECTION_TITLE}>{t.noticeTitle}</h2>
            <ul className="mt-7 grid gap-3 sm:grid-cols-2">
              {t.noticeItems.map((item) => (
                <li key={item} className="flex items-start gap-3.5 rounded-3xl bg-surface-strong p-5 text-[15px] leading-relaxed">
                  <span aria-hidden className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-accent/12 text-accent">
                    <Icon d={CHECK} className="size-3.5" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </aside>
        </div>

        {/* Final call to action */}
        <section className="px-3 pt-24 sm:px-5">
          <div className="relative isolate mx-auto max-w-[1400px] overflow-hidden rounded-[32px] bg-[color:var(--t-ink)] px-6 py-16 text-center text-white sm:rounded-[44px] sm:px-10 sm:py-20">
            <div
              aria-hidden
              className="absolute inset-0 -z-10"
              style={{ background: "radial-gradient(60% 90% at 50% 0%, rgba(43,100,240,0.45), transparent 60%)" }}
            />
            <h2 className="mx-auto max-w-2xl text-[32px] leading-[1.05] font-bold tracking-[-0.045em] text-balance sm:text-[48px]">
              {t.ctaTitle}
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-[16px] leading-relaxed text-white/70">{t.ctaBody}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a
                href="#choose"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-[15px] font-semibold text-[color:var(--t-ink)] transition-transform active:scale-[0.97]"
              >
                {t.ctaChoose}
                <Icon d={DOWN} />
              </a>
              <External
                href={OFFICIAL_LINKS.ds160}
                className="inline-flex h-12 items-center gap-2 rounded-full border border-white/25 px-6 text-[15px] font-semibold transition-colors hover:bg-white/10 active:scale-[0.97]"
              >
                {t.ds160.title}
                <Icon d={ARROW} />
              </External>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative isolate mt-16 overflow-hidden bg-[color:var(--t-ink)] px-4 pt-20 pb-0 text-white sm:px-6 sm:pt-28">
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
            <p className="max-w-xs text-[15px] leading-relaxed text-white/60">{t.footerLine}</p>
            <nav aria-label={copy.brandName} className="flex flex-wrap gap-x-7 gap-y-2 text-[15px] font-medium text-white/70">
              <Link href="/" className="transition-colors hover:text-white">{t.backToWaits}</Link>
              <Link href="/privacy" className="transition-colors hover:text-white">{copy.privacyPolicy}</Link>
              <Link href="/terms" className="transition-colors hover:text-white">{copy.termsOfUse}</Link>
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
