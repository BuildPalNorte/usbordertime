import { cn } from "@/lib/cn";
import { DISCOVER } from "@/lib/discover";
import { guideIndexJsonLd, guideJsonLd, jsonLd } from "@/lib/guide-schema";
import { COPY, type Locale } from "@/lib/i18n";
import { GUIDES, guideById, guideIndexPath, guidePath, type Guide } from "@/lib/guides";
import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

const OTHER: Record<Locale, Locale> = { en: "es", es: "en" };

function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLd(data) }}
    />
  );
}

function number(guide: Guide): string {
  return String(GUIDES.findIndex((item) => item.id === guide.id) + 1).padStart(2, "0");
}

/** Fine diagonal lines behind the headline, drawn in the theme's own line color. */
const LINES: CSSProperties = {
  backgroundImage: "repeating-linear-gradient(115deg, var(--line) 0 1px, transparent 1px 9px)",
};

/** A flat link tile. `featured` takes the accent color. */
function GuideTile({
  locale,
  guide,
  featured,
  className,
}: {
  locale: Locale;
  guide: Guide;
  featured?: boolean;
  className?: string;
}) {
  const copy = COPY[locale];
  const text = guide[locale];
  return (
    <Link
      href={guidePath(locale, guide)}
      className={cn(
        "group flex h-full min-h-[168px] flex-col justify-between gap-6 rounded-[24px] p-5 transition-transform sm:min-h-[200px] sm:gap-10 sm:rounded-[28px] sm:p-6 duration-200 ease-out hover:-translate-y-1 active:scale-[0.985] motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        featured ? "bg-accent text-accent-ink" : "bg-surface ring-1 ring-line",
        className,
      )}
    >
      <span className="font-mono text-[13px] font-medium tracking-[0.08em] opacity-60">{number(guide)}</span>
      <span className="block">
        <span className="block text-[22px] leading-[1.1] font-bold tracking-[-0.03em] text-balance">{text.label}</span>
        <span
          className={cn(
            "mt-2 line-clamp-2 block text-[14px] leading-snug",
            featured ? "opacity-85" : "text-muted",
          )}
        >
          {text.description}
        </span>
        <span className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-semibold">
          {copy.guideRead}
          <span
            aria-hidden
            className="transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
          >
            →
          </span>
        </span>
      </span>
    </Link>
  );
}

function GuideLegal({
  locale,
  className,
  centered,
}: {
  locale: Locale;
  className?: string;
  centered?: boolean;
}) {
  const copy = COPY[locale];
  return (
    <div className={className}>
      <p className="text-[13px] leading-relaxed text-muted">{copy.guideSourceNote}</p>
      <p
        className={cn(
          "mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] font-medium",
          centered && "justify-center",
        )}
      >
        <Link href="/privacy" className="text-muted">
          {copy.privacyPolicy}
        </Link>
        <Link href="/terms" className="text-muted">
          {copy.termsOfUse}
        </Link>
      </p>
    </div>
  );
}

function Wordmark() {
  return (
    <Link href="/" className="flex shrink-0 items-center">
      <Image
        src="/usbt-logo.png"
        alt="Border Time"
        width={303}
        height={128}
        priority
        className="brand-logo h-8 w-auto"
      />
    </Link>
  );
}

function Nav({ locale, otherHref }: { locale: Locale; otherHref: string }) {
  const copy = COPY[locale];
  const other = OTHER[locale];
  return (
    <nav
      aria-label="Border Time"
      className="flex items-center justify-between gap-2 rounded-full bg-surface/80 py-1.5 pr-1.5 pl-3.5 ring-1 ring-line backdrop-blur-md sm:gap-3 sm:py-2 sm:pr-2 sm:pl-5"
    >
      <Wordmark />
      <div className="flex items-center gap-0.5 text-[14px] font-medium sm:gap-1">
        <Link
          href={guideIndexPath(locale)}
          className="hidden min-h-11 items-center rounded-full px-3 text-muted transition-colors hover:text-foreground sm:flex"
        >
          {copy.guideAllGuides}
        </Link>
        <Link
          href={otherHref}
          hrefLang={other}
          lang={other}
          aria-label={copy.guideOtherLanguage}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-full px-2 text-muted transition-colors hover:text-foreground sm:px-3"
        >
          <span aria-hidden className="text-[13px] font-semibold tracking-wide sm:hidden">
            {other.toUpperCase()}
          </span>
          <span className="hidden sm:inline">{copy.guideOtherLanguage}</span>
        </Link>
        <Link
          href="/"
          className="flex min-h-11 items-center rounded-full bg-accent px-4 text-[14px] font-semibold text-accent-ink transition-transform active:scale-[0.97] sm:px-5"
        >
          <span className="sm:hidden">{copy.guideOpenShort}</span>
          <span className="hidden sm:inline">{copy.guideOpenApp}</span>
        </Link>
      </div>
    </nav>
  );
}

/** The soft, lined panel the headline sits in. Content below can overlap its lower edge. */
function Stage({
  locale,
  otherHref,
  title,
  lead,
  overlap,
  children,
}: {
  locale: Locale;
  otherHref: string;
  title: string;
  lead: string;
  /** Pull the content that follows up over the panel's bottom edge. */
  overlap?: boolean;
  children?: ReactNode;
}) {
  const copy = COPY[locale];
  return (
    <div className="mx-auto w-full max-w-5xl px-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5">
      <div
        className={cn(
          "relative overflow-hidden rounded-[32px] bg-surface-strong px-4 pt-4 ring-1 ring-line sm:rounded-[40px] sm:px-6",
          overlap ? "pb-20 sm:pb-36" : "pb-10 sm:pb-20",
        )}
        style={LINES}
      >
        <Nav locale={locale} otherHref={otherHref} />
        <header className="mx-auto mt-10 max-w-3xl text-center sm:mt-20">
          <p className="rise inline-block rounded-full bg-surface px-3 py-1.5 text-[12px] font-medium ring-1 ring-line">
            {copy.guideBadge}
          </p>
          <h1
            className="rise mt-5 text-[clamp(2rem,8.5vw,4.2rem)] leading-[1.04] break-words hyphens-auto font-bold tracking-[-0.045em] text-balance"
            style={{ "--i": 1 } as CSSProperties}
          >
            {title}
          </h1>
          <p
            className="rise mx-auto mt-6 max-w-xl text-[16px] leading-relaxed text-muted text-pretty sm:text-[17px]"
            style={{ "--i": 2 } as CSSProperties}
          >
            {lead}
          </p>
        </header>
      </div>
      {children}
    </div>
  );
}

/** Visible questions. The same words are in the page schema and in /llms.txt, so a model quotes the page. */
function Questions({ locale }: { locale: Locale }) {
  const discover = DISCOVER[locale];
  return (
    <section aria-labelledby="wait-questions" className="mx-auto mt-16 max-w-2xl px-1 sm:mt-20 sm:px-4">
      <h2
        id="wait-questions"
        className="text-[24px] leading-[1.12] font-bold tracking-[-0.035em] text-balance sm:text-[30px]"
      >
        {discover.faqTitle}
      </h2>
      <div className="mt-8 flex flex-col gap-8">
        {discover.faqs.map((faq) => (
          <section key={faq.id}>
            <h3 id={faq.id} className="scroll-mt-8 text-[18px] leading-snug font-semibold tracking-[-0.02em] text-balance">
              {faq.question}
            </h3>
            <p className="mt-2 text-[16px] leading-[1.65] text-muted text-pretty sm:text-[17px]">{faq.answer}</p>
          </section>
        ))}
      </div>
    </section>
  );
}

export function GuideIndex({ locale }: { locale: Locale }) {
  const copy = COPY[locale];
  return (
    <div lang={locale} className="min-h-[100dvh] pb-[max(3rem,env(safe-area-inset-bottom))]">
      <JsonLd data={guideIndexJsonLd(locale)} />
      <main>
        <Stage
          locale={locale}
          otherHref={guideIndexPath(OTHER[locale])}
          title={copy.guidesTitle}
          lead={copy.guidesLead}
          overlap
        >
          <ul className="relative -mt-14 grid gap-3 px-0 sm:-mt-28 sm:grid-cols-2 sm:gap-4 sm:px-4 lg:grid-cols-3">
            {GUIDES.map((guide, index) => (
              <li
                key={guide.id}
                className={cn("rise", index === 0 && "lg:col-span-2")}
                style={{ "--i": index + 3 } as CSSProperties}
              >
                <GuideTile locale={locale} guide={guide} featured={index === 0} />
              </li>
            ))}
          </ul>
          <Questions locale={locale} />
          <GuideLegal locale={locale} centered className="mx-auto mt-10 max-w-xl px-4 text-center" />
        </Stage>
      </main>
    </div>
  );
}

/** Shown while the article's slug resolves, so a navigation can paint this shell immediately. */
export function GuideArticleFallback({ locale }: { locale: Locale }) {
  return (
    <div
      lang={locale}
      aria-busy="true"
      className="min-h-[100dvh] pb-[max(3rem,env(safe-area-inset-bottom))]"
    >
      <main>
        <div className="mx-auto w-full max-w-5xl px-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5">
          <div
            className="relative overflow-hidden rounded-[32px] bg-surface-strong px-4 pt-4 pb-10 ring-1 ring-line sm:rounded-[40px] sm:px-6 sm:pb-20"
            style={LINES}
          >
            <Nav locale={locale} otherHref={guideIndexPath(OTHER[locale])} />
            <header className="mx-auto mt-10 flex max-w-3xl flex-col items-center sm:mt-20">
              <div className="h-7 w-28 rounded-full bg-surface ring-1 ring-line" />
              <div className="mt-5 h-12 w-4/5 max-w-lg rounded-2xl bg-foreground/10 sm:h-16" />
              <div className="mt-6 h-5 w-2/3 max-w-md rounded-full bg-foreground/10" />
            </header>
          </div>
          <div className="mx-auto mt-10 max-w-2xl px-1 sm:mt-20 sm:px-4">
            <div className="h-7 w-2/5 rounded-full bg-foreground/10" />
            <div className="mt-4 h-4 w-full rounded-full bg-foreground/10" />
            <div className="mt-3 h-4 w-11/12 rounded-full bg-foreground/10" />
            <div className="mt-3 h-4 w-4/5 rounded-full bg-foreground/10" />
          </div>
        </div>
      </main>
    </div>
  );
}

export function GuideArticle({ locale, guide }: { locale: Locale; guide: Guide }) {
  const copy = COPY[locale];
  const text = guide[locale];
  const related = guide.related.map(guideById).filter((item): item is Guide => Boolean(item));

  return (
    <div lang={locale} className="min-h-[100dvh] pb-[max(3rem,env(safe-area-inset-bottom))]">
      <JsonLd data={guideJsonLd(locale, guide)} />
      <main>
        <Stage locale={locale} otherHref={guidePath(OTHER[locale], guide)} title={text.title} lead={text.lead}>
          <article className="mx-auto mt-10 max-w-2xl px-1 sm:mt-20 sm:px-4">
            {text.sections.map((section) => (
              <section key={section.heading} className="mt-12 first:mt-0">
                <h2 className="text-[24px] leading-[1.12] font-bold tracking-[-0.035em] text-balance sm:text-[30px]">
                  {section.heading}
                </h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="mt-3 text-[16px] leading-[1.65] text-muted text-pretty sm:mt-4 sm:text-[17px]">
                    {paragraph}
                  </p>
                ))}
              </section>
            ))}

            <section className="mt-16 rounded-[28px] bg-accent p-6 text-accent-ink sm:p-8">
              <h2 className="text-[26px] leading-[1.1] font-bold tracking-[-0.035em] text-balance">
                {copy.guideLiveHeading}
              </h2>
              <p className="mt-3 text-[16px] leading-relaxed opacity-85">{copy.guideLiveBody}</p>
              <Link
                href="/"
                className="mt-6 flex h-12 w-full items-center justify-center rounded-full bg-accent-ink px-6 text-[15px] sm:inline-flex sm:w-auto font-semibold text-accent transition-transform active:scale-[0.97]"
              >
                {copy.guideOpenApp}
              </Link>
            </section>

            {related.length > 0 && (
              <nav aria-label={copy.guideRelated} className="mt-16">
                <h2 className="text-[13px] font-semibold tracking-wide text-muted uppercase">{copy.guideRelated}</h2>
                <ul className="mt-4 grid gap-4 sm:grid-cols-3">
                  {related.map((item) => (
                    <li key={item.id}>
                      <GuideTile locale={locale} guide={item} />
                    </li>
                  ))}
                </ul>
              </nav>
            )}

            <GuideLegal locale={locale} className="mt-12" />
          </article>
        </Stage>
      </main>
    </div>
  );
}
