"use client";

import { useLocale } from "@/components/locale-provider";
import { packetSerif } from "@/components/tramites/packet-font";
import { PacketReview } from "@/components/tramites/packet-review";
import { PacketScan } from "@/components/tramites/packet-scan";
import { PacketSection } from "@/components/tramites/packet-section";
import { PacketSignInNudge } from "@/components/tramites/packet-sign-in-nudge";
import { BrandLockup } from "@/components/wallet/brand-lockup";
import { LanguageSwitch } from "@/components/wallet/language-switch";
import { REDUCED, SPRING } from "@/components/wallet/motion";
import { ThemeSwitch } from "@/components/wallet/theme-switch";
import { haptic } from "@/lib/haptics";
import { isTramitesPathId, tramitesHref } from "@/lib/tramites";
import {
  SECTION_IDS,
  pageCount,
  pageFields,
  pageProblems,
  sectionProblems,
  type FieldProblem,
  type SectionId,
  type StepId,
} from "@/lib/tramites-packet";
import { packetStore } from "@/lib/tramites-packet-store";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";

const PALETTE = {
  "--t-ink": "#0b1b3f",
  "--t-blue": "#2b64f0",
  "--t-wash": "#eef3fe",
} as CSSProperties;

const STEPS: readonly StepId[] = [...SECTION_IDS, "review"];

const noopSubscribe = () => () => {};

function stepIndex(step: StepId): number {
  return STEPS.indexOf(step);
}

export function PacketScreen() {
  const { copy } = useLocale();
  const p = copy.tramites.packet;
  const reduce = useReducedMotion();
  const search = useSearchParams();
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const draft = useSyncExternalStore(packetStore.subscribe, packetStore.getSnapshot, packetStore.getServerSnapshot);

  const [attempt, setAttempt] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const seenStep = useRef<string | null>(null);

  const fromLink = search.get("path");
  useEffect(() => {
    if (hydrated && isTramitesPathId(fromLink)) packetStore.seedErrand(fromLink);
  }, [hydrated, fromLink]);

  // Details this device already knows fill the blanks once, so nothing is typed twice.
  useEffect(() => {
    if (!hydrated) return;
    packetStore.prefill();
  }, [hydrated]);
  const reused = packetStore.getReused();

  const step = draft.lastStep;
  const index = stepIndex(step);

  const section: SectionId | null = step === "review" ? null : step;
  const pages = section ? pageFields(section, draft.answers) : [];
  const pageIndex = Math.min(page, Math.max(pages.length - 1, 0));
  const fields = pages[pageIndex] ?? [];
  const lastPage = pageIndex >= pages.length - 1;

  // Each new screen starts at the top, with the title announced. The first paint is left alone.
  const screenKey = `${step}:${pageIndex}`;
  useEffect(() => {
    if (!hydrated) return;
    if (seenStep.current !== null && seenStep.current !== screenKey) {
      window.scrollTo({ top: 0 });
      headingRef.current?.focus({ preventScroll: true });
    }
    seenStep.current = screenKey;
  }, [hydrated, screenKey]);

  // One smooth bar over every screen, not a count of twelve steps.
  const totalScreens = SECTION_IDS.reduce((sum, id) => sum + pageCount(id), 0);
  const screensBefore = STEPS.slice(0, index).reduce((sum, id) => sum + (id === "review" ? 0 : pageCount(id)), 0);
  const percent = Math.round(((section ? screensBefore + pageIndex : totalScreens) / (totalScreens + 1)) * 100);

  const problems: Record<string, FieldProblem> = {};
  if (section && attempt === screenKey) {
    for (const item of pageProblems(fields, draft.answers)) problems[item.id] = item.problem;
  }
  const problemCount = Object.keys(problems).length;

  function go(target: StepId, toLast = false) {
    haptic("selection");
    setAttempt(null);
    setPage(toLast && target !== "review" ? pageCount(target) - 1 : 0);
    packetStore.goTo(target);
  }

  function back() {
    if (pageIndex > 0) {
      haptic("selection");
      setAttempt(null);
      setPage(pageIndex - 1);
      return;
    }
    go(STEPS[index - 1], true);
  }

  function next() {
    if (!section) return;
    // A screen checks only its own questions. The last one also catches anything edited out of order.
    const issues = lastPage ? sectionProblems(section, draft.answers) : pageProblems(fields, draft.answers);
    if (issues.length > 0) {
      haptic("error");
      const owner = pages.findIndex((list) => list.some((field) => field.id === issues[0].id));
      if (owner >= 0 && owner !== pageIndex) {
        setPage(owner);
        setAttempt(`${step}:${owner}`);
      } else {
        setAttempt(screenKey);
      }
      window.requestAnimationFrame(() => {
        const box = document.getElementById(`pf-${issues[0].id}`);
        box?.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
        box?.querySelector<HTMLElement>("input:not(:disabled), textarea, button")?.focus({ preventScroll: true });
      });
      return;
    }
    haptic("light");
    setAttempt(null);
    if (!lastPage) {
      setPage(pageIndex + 1);
      return;
    }
    setPage(0);
    // Leaving the nudge moment without tapping Not now still clears it — it must not chase later steps.
    if (section === "travel" && draft.nudgeDismissedAt === null) packetStore.dismissNudge();
    packetStore.complete(section, STEPS[index + 1] ?? "review");
  }

  const enter = reduce ? REDUCED : SPRING.snap;
  const earned = draft.completed.includes("personal") && draft.completed.includes("passport");
  // Only on the first step after passport — one soft ask, then gone.
  const nudgeOnTravel = earned && step === "travel";

  return (
    <div style={PALETTE} className="t-page relative min-h-[100dvh] overflow-x-clip">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px]" style={{ background: "var(--t-glow)", opacity: 0.9 }} aria-hidden />
      <header className="relative mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between gap-3 px-7 pt-4 sm:px-12">
        <Link href="/" aria-label={copy.brandName} className="text-tfg">
          <BrandLockup />
        </Link>
        <div className="flex items-center gap-2">
          <ThemeSwitch />
          <LanguageSwitch />
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-[640px] px-5 pt-8 pb-32 sm:pt-12">
        <Link
          href={tramitesHref(draft.pathId)}
          className="inline-flex min-h-9 items-center gap-1.5 text-[13px] text-tfg/60 transition-colors hover:text-tfg"
        >
          <svg aria-hidden viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 8H3M7 4 3 8l4 4" />
          </svg>
          {p.back}
        </Link>

        {hydrated ? (
          <>
            <nav aria-label={p.progressLabel} className="mt-6">
              <div
                role="progressbar"
                aria-label={p.progressLabel}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
                className="h-[3px] w-full overflow-hidden rounded-full bg-tfg/15"
              >
                <div
                  className="h-full rounded-full bg-tfg transition-[width] duration-500 ease-out motion-reduce:transition-none"
                  style={{ width: `${Math.max(percent, 3)}%` }}
                />
              </div>
              <p className="mt-2 flex items-center justify-between font-mono text-[11px] text-tfg/45">
                <span>{p.percentDone(percent)}</span>
                <span>{p.saved}</span>
              </p>
            </nav>

            <PacketSignInNudge earned={nudgeOnTravel} dismissed={draft.nudgeDismissedAt !== null} />

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={screenKey}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={enter}
              >
                <h1
                  ref={headingRef}
                  tabIndex={-1}
                  className={`${packetSerif.className} mt-10 text-[30px] leading-[1.15] tracking-[-0.01em] text-balance outline-none sm:text-[38px]`}
                >
                  {section ? (p.pageTitles[section][pageIndex] ?? p.sections[section].title) : p.review.title}
                </h1>
                <p className="mt-3 max-w-md text-[14px] leading-relaxed text-tfg/65 text-pretty">
                  {section ? p.sections[section].lead : p.review.lead}
                </p>
                {section === "personal" && pageIndex === 0 ? (
                  <PacketScan offer={!draft.answers.surname} />
                ) : section === "passport" && pageIndex === 0 ? (
                  <PacketScan offer={!draft.answers.passportNumber} />
                ) : null}
                {reused > 0 && (section === "personal" || section === "contact" || section === "passport") ? (
                  <p className="mt-3 max-w-md rounded-xl bg-tfg/[0.05] px-3.5 py-2.5 text-[12px] leading-relaxed text-tfg/70 ring-1 ring-tfg/12">
                    {p.reused}
                  </p>
                ) : null}

                {section ? (
                  <>
                    <PacketSection
                      section={section}
                      page={pageIndex}
                      answers={draft.answers}
                      problems={problems}
                      onChange={(id, value) => packetStore.setAnswer(id, value)}
                    />
                    {problemCount > 0 ? (
                      <p role="alert" className="mt-6 text-[13px] text-tdanger">
                        {p.fixCount(problemCount)}
                      </p>
                    ) : null}
                    {/* Spacer so the sticky bar does not cover the last field. */}
                    <div className="h-24" aria-hidden />
                  </>
                ) : (
                  <>
                    <PacketReview draft={draft} onEdit={(target) => go(target)} />
                    <div className="mt-10">
                      <button
                        type="button"
                        onClick={back}
                        className="inline-flex h-12 items-center rounded-full px-5 text-[15px] text-tfg/80 ring-1 ring-tfg/20 transition-colors hover:bg-tfg/10 active:scale-[0.97]"
                      >
                        {p.previous}
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            {section ? (
              <div className="pointer-events-none sticky bottom-0 z-10 -mx-5 mt-2 px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-4">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-[calc(100%+1.5rem)] bg-gradient-to-t from-[color:var(--t-bg)] via-[color:var(--t-bg)]/95 to-transparent"
                />
                <div className="relative flex items-center justify-between gap-3">
                  {index > 0 || pageIndex > 0 ? (
                    <button
                      type="button"
                      onClick={back}
                      className="pointer-events-auto inline-flex h-12 items-center rounded-full bg-tbg/80 px-5 text-[15px] text-tfg/80 ring-1 ring-tfg/20 backdrop-blur transition-colors hover:bg-tfg/10 active:scale-[0.97]"
                    >
                      {p.previous}
                    </button>
                  ) : (
                    <span />
                  )}
                  <button
                    type="button"
                    onClick={next}
                    className="pointer-events-auto ml-auto inline-flex h-12 items-center rounded-full bg-tfg px-7 text-[15px] font-medium text-tpill shadow-[0_12px_28px_-12px_rgba(5,20,70,0.55)] transition-transform active:scale-[0.97]"
                  >
                    {section === "docs" && lastPage ? p.toReview : p.next}
                  </button>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <div aria-hidden className="mt-10 space-y-4">
            <span className="tramites-pulse block h-1 w-full rounded-full" />
            <span className="tramites-pulse block h-10 w-3/4 rounded-full" />
            <span className="tramites-pulse block h-14 w-full rounded-xl" />
          </div>
        )}

        <footer className="mt-16 border-t border-tfg/10 pt-6">
          <p className="text-[12px] leading-relaxed text-tfg/50">{p.hedge}</p>
          <p className="mt-2 text-[12px] leading-relaxed text-tfg/40">{p.privacy}</p>
        </footer>
      </main>
    </div>
  );
}
