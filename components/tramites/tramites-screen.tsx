"use client";

import { BrandLockup } from "@/components/wallet/brand-lockup";
import { useLocale } from "@/components/locale-provider";
import { DocGlyph, ErrandArt, StepArt } from "@/components/tramites/tramites-art";
import { TramitesAskBar } from "@/components/tramites/tramites-ask-bar";
import { LanguageSwitch } from "@/components/wallet/language-switch";
import { REDUCED, SPRING } from "@/components/wallet/motion";
import { ThemeSwitch } from "@/components/wallet/theme-switch";
import { cn } from "@/lib/cn";
import {
  OFFICIAL_LINKS,
  TRAMITES_DOC_ICONS,
  TRAMITES_PATH_IDS,
  tramitesHref,
  tramitesPathFrom,
  type TramitesDocIcon,
} from "@/lib/tramites";
import { packetHref } from "@/lib/tramites-packet";
import { packetStore } from "@/lib/tramites-packet-store";
import { Libre_Baskerville } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type Transition,
} from "motion/react";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";

const serif = Libre_Baskerville({ subsets: ["latin"], weight: ["400"], style: ["normal", "italic"] });

/** Page-only brand colors. Text, background, and glow follow the theme (`.t-page` in globals.css). */
const PALETTE = {
  "--t-ink": "#0b1b3f",
  "--t-blue": "#2b64f0",
  "--t-wash": "#eef3fe",
} as CSSProperties;

/** Film grain: fractal noise tile, laid over everything in the footer, logo included, so it reads as printed, not flat. */
const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='2.4 0 0 0 -0.7  2.4 0 0 0 -0.7  2.4 0 0 0 -0.7  0 0 0 0 0.55'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

const CARD_GLOW =
  "radial-gradient(70% 90% at 60% 0%, rgba(43,100,240,0.55), transparent 70%), linear-gradient(180deg, #0a1636 0%, #070a14 100%)";

const SERIF = serif.className;
const H2 = `${SERIF} text-[28px] leading-[1.15] tracking-[-0.01em] text-balance sm:text-[38px]`;
const PILL =
  "inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full bg-tfg px-5 text-[14px] font-medium text-tpill transition-transform active:scale-[0.97]";

/** The faint frame a picture sits in. Words stay outside it, on the page. */
const ART_FRAME = "rounded-2xl bg-tfg/[0.04] px-5 py-4 text-tfg/80 ring-1 ring-tfg/[0.08]";
/** The small square a document picture sits in, tinted with the accent. */
const GLYPH_BADGE = "grid size-12 shrink-0 place-items-center rounded-xl bg-tfg/[0.06] text-[color:var(--t-sky)]";

const hidden = { opacity: 0, y: 22 };
const shown = { opacity: 1, y: 0 };
const view = { once: true, margin: "-10% 0px" as const };

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

/** Words fade and rise in, one after another. Screen readers still hear the full line once. */
function SplitTitle({ text, className, reduce }: { text: string; className?: string; reduce: boolean | null }) {
  const words = text.match(/\S+\s*/g) ?? [text];
  return (
    <h1 className={className}>
      <span aria-hidden className="inline">
        {words.map((word, i) => (
          <motion.span
            key={`${word}-${i}`}
            className="inline-block whitespace-pre"
            initial={reduce ? false : { opacity: 0, y: 28, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.65, ease: "easeOut", delay: reduce ? 0 : i * 0.055 }}
          >
            {word}
          </motion.span>
        ))}
      </span>
      <span className="sr-only">{text}</span>
    </h1>
  );
}

/** A plain pill link. No hover motion; the press is a small scale from the pill's own classes. */
function PillLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}

/** Footer: text staggers in, the cobalt bloom expands, and the mark rises through the grain as you scroll. */
function TramitesFooter({
  brandName,
  headline,
  headlineMuted,
  fineprint,
  backToWaits,
  privacy,
  terms,
  reduce,
  enter,
  stagger,
}: {
  brandName: string;
  headline: string;
  headlineMuted: string;
  fineprint: string;
  backToWaits: string;
  privacy: string;
  terms: string;
  reduce: boolean | null;
  enter: Transition;
  stagger: number;
}) {
  const footerRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: footerRef,
    offset: ["start end", "end end"],
  });
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 28, mass: 0.6 });
  const logoY = useTransform(progress, [0, 1], reduce ? [0, 0] : [120, 0]);
  const logoOpacity = useTransform(progress, [0, 0.35, 1], reduce ? [1, 1, 1] : [0.15, 0.55, 1]);
  const logoBlur = useTransform(progress, [0, 0.55, 1], reduce ? [0, 0, 0] : [12, 4, 0]);
  const logoFilter = useTransform(logoBlur, (b) => `blur(${b}px)`);
  const glowScale = useTransform(progress, [0, 1], reduce ? [1, 1] : [0.55, 1.2]);
  const glowOpacity = useTransform(progress, [0, 0.4, 1], reduce ? [0.4, 0.4, 0.4] : [0.15, 0.45, 0.7]);
  const gridOpacity = useTransform(progress, [0, 1], reduce ? [0.08, 0.08] : [0, 0.1]);

  return (
    <footer
      ref={footerRef}
      className="relative isolate mt-24 overflow-hidden bg-[color:var(--t-ink)] px-4 pt-20 pb-0 text-white sm:px-6 sm:pt-28"
    >
      <motion.div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          opacity: glowOpacity,
          background:
            "radial-gradient(45% 60% at 20% 120%, rgba(43,100,240,0.6), transparent 60%), radial-gradient(45% 55% at 85% 110%, rgba(157,192,255,0.28), transparent 65%)",
        }}
      />
      <motion.div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          opacity: gridOpacity,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(80% 100% at 50% 100%, black, transparent)",
        }}
      />

      <div className="mx-auto max-w-6xl">
        <motion.div
          initial="hidden"
          whileInView="shown"
          viewport={{ once: true, margin: "-8% 0px" }}
          variants={{
            hidden: {},
            shown: { transition: { staggerChildren: stagger, delayChildren: reduce ? 0 : 0.05 } },
          }}
        >
          <motion.p
            className="max-w-3xl text-[28px] leading-[1.12] font-bold tracking-[-0.035em] text-balance sm:text-[44px]"
            variants={{
              hidden: reduce ? shown : { opacity: 0, y: 28, filter: "blur(8px)" },
              shown: { opacity: 1, y: 0, filter: "blur(0px)" },
            }}
            transition={enter}
          >
            {headline}
            <span className="text-white/45"> {headlineMuted}</span>
          </motion.p>

          <motion.div
            className="mt-12 flex flex-wrap items-end justify-between gap-8"
            variants={{
              hidden: reduce ? shown : hidden,
              shown,
            }}
            transition={enter}
          >
            <p className="max-w-xs text-[15px] leading-relaxed text-white/60">{fineprint}</p>
            <nav aria-label={brandName} className="flex flex-wrap gap-2.5 text-[15px] font-semibold">
              <PillLink
                href="/"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-5 text-[color:var(--t-ink)] transition-transform active:scale-[0.97]"
              >
                {backToWaits}
                <Icon d={RIGHT} />
              </PillLink>
              <Link
                href="/privacy"
                className="inline-flex h-12 items-center rounded-full bg-white/10 px-5 text-white ring-1 ring-white/25 backdrop-blur transition-colors hover:bg-white/20 active:scale-[0.97]"
              >
                {privacy}
              </Link>
              <Link
                href="/terms"
                className="inline-flex h-12 items-center rounded-full bg-white/10 px-5 text-white ring-1 ring-white/25 backdrop-blur transition-colors hover:bg-white/20 active:scale-[0.97]"
              >
                {terms}
              </Link>
            </nav>
          </motion.div>
        </motion.div>

        <div className="relative mt-14 sm:mt-20">
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-x-[6%] -top-24 bottom-0 -z-10 rounded-full bg-[color:var(--t-blue)]/40 blur-[110px]"
            style={{ scale: glowScale, opacity: glowOpacity }}
          />
          <motion.div
            className="aspect-[2424/720] select-none overflow-hidden will-change-transform"
            style={{ y: logoY, opacity: logoOpacity, filter: logoFilter }}
          >
            <Image
              src="/usbt-logo.svg"
              alt={brandName}
              width={2424}
              height={1024}
              unoptimized
              className="h-auto w-full"
              style={{
                maskImage: "linear-gradient(to bottom, #000 25%, rgba(0,0,0,0) 100%)",
                WebkitMaskImage: "linear-gradient(to bottom, #000 25%, rgba(0,0,0,0) 100%)",
              }}
            />
          </motion.div>
        </div>
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10 opacity-[0.2]"
        style={{ backgroundImage: GRAIN, backgroundSize: "220px 220px" }}
      />
    </footer>
  );
}

export function TramitesScreen() {
  const { copy } = useLocale();
  const t = copy.tramites;
  const selected = tramitesPathFrom(useSearchParams().get("path"));
  const path = t.paths[selected];
  const hasPacket =
    useSyncExternalStore(packetStore.subscribe, packetStore.getSnapshot, packetStore.getServerSnapshot).updatedAt > 0;
  const reduce = useReducedMotion();
  const enter: Transition = reduce ? REDUCED : { duration: 0.55, ease: [0.23, 1, 0.32, 1] };
  const stagger = reduce ? 0 : 0.07;

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

  const links: { key: string; href: string; icon: TramitesDocIcon; title: string; body: string }[] = [
    { key: "ds160", href: OFFICIAL_LINKS.ds160, icon: "form", ...t.ds160 },
    { key: "appointment", href: OFFICIAL_LINKS.appointment, icon: "calendar", ...t.appointment },
    { key: "embassy", href: OFFICIAL_LINKS.embassy, icon: "building", ...t.embassy },
  ];
  const faqLinks = { fees: OFFICIAL_LINKS.fees, waitTimes: OFFICIAL_LINKS.waitTimes };

  return (
    <div style={PALETTE} className="t-page min-h-[100dvh] scroll-smooth">
      <header
        className={cn(
          "sticky top-[-0.5rem] z-30 -mb-16 pt-2 sm:top-[-1rem] sm:-mb-20 sm:pt-4 transition-[background-color,backdrop-filter] duration-300",
          scrolled ? "bg-tbg/75 backdrop-blur-xl" : "bg-transparent",
        )}
      >
        <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center justify-between gap-3 px-7 sm:h-16 sm:px-12">
          <Link href="/" aria-label={copy.brandName} className="text-tfg">
            <BrandLockup />
          </Link>
          <div className="flex items-center gap-2">
            <a href="#checklist" className="hidden h-8 items-center whitespace-nowrap rounded-full bg-tfg px-4 text-[12px] font-medium text-tpill transition-transform active:scale-[0.97] sm:inline-flex">
              {t.ctaPrimary}
            </a>
            <ThemeSwitch />
            <LanguageSwitch />
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1200px] px-2 pt-2 sm:px-4 sm:pt-4">
        {/* Hero */}
        <section className="relative isolate overflow-hidden rounded-[20px]" style={{ background: "var(--t-glow)" }}>
          <div className="mx-auto flex max-w-3xl flex-col items-center px-5 pt-20 pb-24 text-center sm:pt-28 sm:pb-32">
            <SplitTitle
              text={t.title}
              reduce={reduce}
              className={`${SERIF} text-[40px] leading-[1.1] tracking-[-0.02em] text-balance sm:text-[60px]`}
            />
            <motion.p
              className="mt-6 max-w-xl text-[14px] leading-relaxed text-tfg/75 text-pretty sm:text-[15px]"
              initial={reduce ? false : hidden}
              animate={shown}
              transition={{ ...enter, delay: reduce ? 0 : 0.28 }}
            >
              {t.lead}
            </motion.p>
            <motion.div
              className="mt-8 flex w-full justify-center"
              initial={reduce ? false : hidden}
              animate={shown}
              transition={{ ...enter, delay: reduce ? 0 : 0.4 }}
            >
              <TramitesAskBar />
            </motion.div>
            <motion.div
              className="mt-6 flex flex-wrap items-center justify-center gap-3"
              initial={reduce ? false : hidden}
              animate={shown}
              transition={{ ...enter, delay: reduce ? 0 : 0.5 }}
            >
              <PillLink href="#checklist" className={PILL}>
                {t.ctaPrimary}
              </PillLink>
              <a href="#how" className="inline-flex h-10 items-center rounded-full px-4 text-[14px] text-tfg/80 ring-1 ring-tfg/25 transition-colors hover:bg-tfg/10">
                {t.ctaSecondary}
              </a>
            </motion.div>
          </div>
        </section>

        <div className="px-3 sm:px-8">
          {/* Errands */}
          <section id="errands" aria-labelledby="errands-title" className="scroll-mt-20 pt-24 sm:pt-40">
            <motion.h2
              id="errands-title"
              className={`${SERIF} max-w-3xl text-[28px] leading-[1.2] text-balance sm:text-[40px]`}
              initial={reduce ? false : hidden}
              whileInView={shown}
              viewport={view}
              transition={enter}
            >
              {t.servicesTitle}
              <span className="text-tfg/40"> {t.servicesLead}</span>
            </motion.h2>
            <motion.ul
              className="mt-16 grid gap-x-8 gap-y-10 border-t border-tfg/12 pt-8 sm:grid-cols-2 lg:grid-cols-4"
              initial="hidden"
              whileInView="shown"
              viewport={view}
              variants={{
                hidden: {},
                shown: { transition: { staggerChildren: stagger } },
              }}
            >
              {TRAMITES_PATH_IDS.map((id) => {
                const errand = t.paths[id];
                return (
                  <motion.li
                    key={id}
                    variants={{ hidden: reduce ? shown : hidden, shown }}
                    transition={enter}
                  >
                    <Link href={`${tramitesHref(id)}#checklist`} className="group block">
                      <span className={cn(ART_FRAME, "mb-5 block transition-[transform,background-color] duration-300 group-hover:-translate-y-0.5 group-hover:bg-tfg/[0.07]")}>
                        <ErrandArt id={id} className="mx-auto max-w-[180px]" />
                      </span>
                      <span className={`${SERIF} block text-[18px] leading-tight`}>{errand.label}</span>
                      <span className="mt-3 block text-[12px] leading-relaxed text-tfg/60">{errand.blurb}</span>
                      <span className="mt-4 inline-flex items-center gap-1.5 text-[12px] text-tfg/90">
                        {t.serviceCta}
                        <Icon d={RIGHT} className="size-3 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </Link>
                  </motion.li>
                );
              })}
            </motion.ul>
          </section>

          {/* How it works */}
          <section id="how" aria-labelledby="how-title" className="scroll-mt-20 pt-24 sm:pt-40">
            <motion.h2
              id="how-title"
              className={`${H2} max-w-md`}
              initial={reduce ? false : hidden}
              whileInView={shown}
              viewport={view}
              transition={enter}
            >
              {t.howTitle}
            </motion.h2>
            <motion.ol
              className="mt-16 grid gap-x-8 gap-y-12 md:grid-cols-3"
              initial="hidden"
              whileInView="shown"
              viewport={view}
              variants={{
                hidden: {},
                shown: { transition: { staggerChildren: stagger } },
              }}
            >
              {t.steps.map((step, i) => (
                <motion.li
                  key={step.title}
                  className="relative"
                  variants={{ hidden: reduce ? shown : hidden, shown }}
                  transition={enter}
                >
                  <div className={ART_FRAME}>
                    <StepArt index={i} className="mx-auto max-w-[200px]" />
                  </div>
                  <div className="relative mt-6 flex items-center gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[color:var(--t-sky)] font-mono text-[13px] font-semibold text-tbg">
                      {i + 1}
                    </span>
                    {i < t.steps.length - 1 ? (
                      <span aria-hidden className="hidden h-px flex-1 border-t border-dashed border-tfg/25 md:block md:-mr-8" />
                    ) : null}
                  </div>
                  <p className={`${SERIF} mt-4 text-[18px] leading-tight`}>{step.title}</p>
                  <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-tfg/65">{step.body}</p>
                </motion.li>
              ))}
            </motion.ol>
          </section>

          {/* The checklist: where a visit converts */}
          <section id="checklist" aria-labelledby="checklist-title" className="scroll-mt-20 pt-24 sm:pt-40">
            <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
              <motion.div
                initial={reduce ? false : hidden}
                whileInView={shown}
                viewport={view}
                transition={enter}
              >
                <h2 id="checklist-title" className={H2}>{t.chooseTitle}</h2>
                <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-tfg/60">{t.checklistLead}</p>
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
                          active ? "bg-tfg font-medium text-tpill" : "text-tfg/75 ring-1 ring-tfg/20 hover:bg-tfg/10",
                        )}
                      >
                        {t.paths[id].label}
                      </Link>
                    );
                  })}
                </nav>
                <section aria-labelledby="packet-title" className="mt-10 border-t border-tfg/12 pt-5">
                  <h3 id="packet-title" className={`${SERIF} text-[18px] leading-tight`}>{t.packet.entry.title}</h3>
                  <p className="mt-2 max-w-sm text-[12px] leading-relaxed text-tfg/60">{t.packet.entry.body}</p>
                  <Link href={packetHref(selected)} className={cn(PILL, "mt-4")}>
                    {hasPacket ? t.packet.entry.resume : t.packet.entry.cta}
                    <Icon d={RIGHT} />
                  </Link>
                </section>
                <section aria-labelledby="stop-title" className="mt-10 border-t border-tfg/12 pt-5">
                  <h3 id="stop-title" className="flex items-center gap-2 text-[13px] text-tdanger">
                    <DocGlyph kind="warning" className="size-4" />
                    {t.stopTitle}
                  </h3>
                  <p className="mt-2 text-[12px] leading-relaxed text-tfg/60">{t.stopBody}</p>
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {t.stopItems.map((item) => (
                      <li key={item} className="rounded-full px-2.5 py-1 text-[11px] text-tfg/75 ring-1 ring-tfg/15">{item}</li>
                    ))}
                  </ul>
                </section>
              </motion.div>

              <motion.div
                key={selected}
                className="min-w-0"
                initial={reduce ? false : { opacity: 0, y: 14 }}
                animate={shown}
                transition={reduce ? REDUCED : SPRING.snap}
              >
                <div className="flex items-baseline justify-between gap-4 border-b border-tfg/12 pb-4">
                  <p className={`${SERIF} text-[22px] leading-tight`}>{path.label}</p>
                  <span className="shrink-0 font-mono text-[11px] text-tfg/50">
                    {path.docs.length} {t.previewItems}
                  </span>
                </div>
                <p className="mt-4 text-[13px] leading-relaxed text-pretty text-tfg/65">{path.what}</p>
                <motion.ul
                  className="mt-6 divide-y divide-tfg/10 border-y border-tfg/10"
                  initial="hidden"
                  animate="shown"
                  variants={{
                    hidden: {},
                    shown: { transition: { staggerChildren: reduce ? 0 : 0.04 } },
                  }}
                >
                  {path.docs.map((doc, i) => (
                    <motion.li
                      key={doc}
                      className="flex items-center gap-4 py-3 text-[14px] leading-snug text-tfg/85"
                      variants={{ hidden: reduce ? shown : { opacity: 0, y: 10 }, shown }}
                      transition={enter}
                    >
                      <span className={GLYPH_BADGE}>
                        <DocGlyph kind={TRAMITES_DOC_ICONS[selected][i] ?? "folder"} className="size-7" />
                      </span>
                      <span>{doc}</span>
                    </motion.li>
                  ))}
                </motion.ul>
                <p className="mt-3 text-[11px] leading-relaxed text-tfg/45">{t.docsNote}</p>

                <h3 className={`${SERIF} mt-10 text-[18px]`}>{t.nextTitle}</h3>
                <ul className="mt-3 divide-y divide-tfg/10 border-y border-tfg/10">
                  {links.map((link, i) => (
                    <li key={link.key}>
                      <External href={link.href} className="group flex items-center gap-4 py-4 transition-colors hover:text-tfg">
                        <span className="w-5 font-mono text-[11px] text-tfg/45">0{i + 1}</span>
                        <span className={GLYPH_BADGE}>
                          <DocGlyph kind={link.icon} className="size-7" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[14px] text-tfg">{link.title}</span>
                          <span className="block text-[12px] text-tfg/55">{link.body}</span>
                        </span>
                        <Icon d={ARROW} className="text-tfg/60 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </External>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>
          </section>

          {/* FAQ */}
          <section id="faq" aria-labelledby="faq-title" className="scroll-mt-20 pt-24 sm:pt-40">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
              <motion.h2
                id="faq-title"
                className={`${H2} max-w-xs`}
                initial={reduce ? false : hidden}
                whileInView={shown}
                viewport={view}
                transition={enter}
              >
                {t.faqTitle}
              </motion.h2>
              <motion.div
                className="divide-y divide-tfg/10 border-y border-tfg/10"
                initial="hidden"
                whileInView="shown"
                viewport={view}
                variants={{
                  hidden: {},
                  shown: { transition: { staggerChildren: stagger } },
                }}
              >
                {t.faq.map((item) => (
                  <motion.details
                    key={item.q}
                    className="group"
                    variants={{ hidden: reduce ? shown : hidden, shown }}
                    transition={enter}
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-4 text-[13px] text-tfg/90 [&::-webkit-details-marker]:hidden">
                      {item.q}
                      <Icon d={CHEVRON} className="size-3.5 text-tfg/60 transition-transform duration-300 group-open:rotate-180" />
                    </summary>
                    <div className="pr-8 pb-5">
                      <p className="text-[12px] leading-relaxed text-tfg/60">{item.a}</p>
                      {item.link ? (
                        <External href={faqLinks[item.link.to]} className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-tfg underline underline-offset-4">
                          {item.link.label}
                          <Icon d={ARROW} className="size-3" />
                        </External>
                      ) : null}
                    </div>
                  </motion.details>
                ))}
              </motion.div>
            </div>
          </section>

          {/* Final call to action */}
          <section className="pt-24 sm:pt-40">
            <motion.div
              className="t-dark relative isolate overflow-hidden rounded-[20px] px-6 py-14 ring-1 ring-tfg/10 sm:px-12 sm:py-16"
              style={{ background: CARD_GLOW }}
              initial={reduce ? false : hidden}
              whileInView={shown}
              viewport={view}
              transition={enter}
            >
              <p className={`${SERIF} max-w-md text-[26px] leading-[1.25] text-balance sm:text-[32px]`}>{t.finalTitle}</p>
              <p className="mt-4 max-w-md text-[13px] leading-relaxed text-tfg/65">{t.finalBody}</p>
              <PillLink href="#checklist" className={cn(PILL, "mt-10")}>
                {t.ctaPrimary}
              </PillLink>
            </motion.div>
          </section>
        </div>
      </div>

      <TramitesFooter
        brandName={copy.brandName}
        headline={t.footerHeadline}
        headlineMuted={t.footerHeadlineMuted}
        fineprint={t.fineprint}
        backToWaits={t.backToWaits}
        privacy={copy.privacyPolicy}
        terms={copy.termsOfUse}
        reduce={reduce}
        enter={enter}
        stagger={stagger}
      />
    </div>
  );
}
