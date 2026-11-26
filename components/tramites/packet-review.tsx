"use client";

import { useLocale } from "@/components/locale-provider";
import { packetSerif } from "@/components/tramites/packet-font";
import type { Copy } from "@/lib/i18n";
import { haptic } from "@/lib/haptics";
import {
  docKey,
  flaggedSecurity,
  NOT_APPLICABLE,
  OPTIONS,
  packetPathFrom,
  SECTION_IDS,
  sectionHasProblems,
  visibleFields,
  type Answers,
  type FieldDef,
  type OptionKey,
  type SectionId,
} from "@/lib/tramites-packet";
import { packetStore, type PacketDraft } from "@/lib/tramites-packet-store";
import { useState } from "react";

type PacketText = Copy["tramites"]["packet"];

/** ISO date → a date a person can skim. Falls back to the raw string. */
export function friendlyDate(value: string, locale: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale === "es" ? "es-MX" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

/** The answer as a person would read it back. */
function show(def: FieldDef, answers: Answers, p: PacketText, locale: string): string | null {
  const value = (answers[def.id] ?? "").trim();
  if (value === "") return null;
  if (value === NOT_APPLICABLE) return p.dna;
  if (def.kind === "yesno") return value === "yes" ? p.yes : p.no;
  if (def.kind === "select" && def.id in OPTIONS) return p.options[`${def.id}.${value}` as OptionKey] ?? value;
  if (def.kind === "date") return friendlyDate(value, locale);
  return value;
}

function sectionRows(
  section: SectionId,
  answers: Answers,
  copy: Copy,
  locale: string,
): { label: string; value: string | null }[] {
  const p = copy.tramites.packet;
  if (section === "docs") {
    const docs = copy.tramites.paths[packetPathFrom(answers)].docs;
    return docs.map((doc, index) => ({
      label: doc,
      value: answers[docKey(index)] === "yes" ? p.docs.have : null,
    }));
  }
  return visibleFields(section, answers).map((def) => ({
    label: p.fields[def.id as keyof typeof p.fields]?.label ?? def.id,
    value: show(def, answers, p, locale),
  }));
}

/** Plain text of the packet, for pasting somewhere else. */
function summaryText(answers: Answers, copy: Copy, locale: string): string {
  const p = copy.tramites.packet;
  const blocks = SECTION_IDS.map((section) => {
    const rows = sectionRows(section, answers, copy, locale)
      .filter((row) => row.value)
      .map((row) => `${row.label}: ${row.value}`);
    return rows.length ? `${p.sections[section].title}\n${rows.join("\n")}` : null;
  });
  return blocks.filter(Boolean).join("\n\n");
}

export function isSectionDone(draft: PacketDraft, section: SectionId): boolean {
  return draft.completed.includes(section) && !sectionHasProblems(section, draft.answers);
}

type Props = {
  draft: PacketDraft;
  onEdit: (section: SectionId) => void;
};

/** Everything answered, section by section, then the sign-off. */
export function PacketReview({ draft, onEdit }: Props) {
  const { copy, locale } = useLocale();
  const p = copy.tramites.packet;
  const [copied, setCopied] = useState(false);

  const undone = SECTION_IDS.filter((section) => !isSectionDone(draft, section));
  const flagged = flaggedSecurity(draft.answers);
  const ready = draft.attestedAt !== null && undone.length === 0;

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(summaryText(draft.answers, copy, locale));
      haptic("success");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the summary is still on screen.
    }
  }

  return (
    <div>
      {undone.length > 0 ? (
        <div className="mt-7 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-tfg/[0.05] p-4 ring-1 ring-tfg/12">
          <p className="text-[13px] text-tfg/80">{p.review.stepsLeft(undone.length)}</p>
          <button
            type="button"
            onClick={() => onEdit(undone[0])}
            className="inline-flex h-10 items-center rounded-full bg-tfg px-5 text-[14px] font-medium text-tpill transition-transform active:scale-[0.97]"
          >
            {p.review.finish}
          </button>
        </div>
      ) : null}

      {flagged.length > 0 ? (
        <div role="note" className="mt-4 rounded-2xl p-4 ring-1 ring-tdanger/40">
          <p className="text-[13px] font-medium text-tdanger">{p.review.flagTitle}</p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-tfg/65">{p.review.flagBody}</p>
        </div>
      ) : null}

      <div className="mt-7 divide-y divide-tfg/10 border-y border-tfg/10">
        {SECTION_IDS.map((section) => {
          const done = isSectionDone(draft, section);
          const rows = sectionRows(section, draft.answers, copy, locale);
          return (
            <details key={section} className="group" open={!done}>
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 [&::-webkit-details-marker]:hidden">
                <span className="flex min-w-0 items-center gap-3">
                  <span
                    aria-hidden
                    className={`size-2 shrink-0 rounded-full ${done ? "bg-[color:var(--t-sky)]" : "bg-tfg/25"}`}
                  />
                  <span className={`${packetSerif.className} truncate text-[17px]`}>{p.sections[section].title}</span>
                </span>
                <svg
                  aria-hidden
                  viewBox="0 0 16 16"
                  className="size-3.5 shrink-0 text-tfg/60 transition-transform duration-300 group-open:rotate-180"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 6.5 8 10.5l4-4" />
                </svg>
              </summary>
              <div className="pb-4">
                <dl className="space-y-2.5">
                  {rows.map((row) => (
                    <div key={row.label} className="grid grid-cols-[1fr_1.1fr] gap-x-4 text-[13px] leading-snug">
                      <dt className="text-tfg/50">{row.label}</dt>
                      <dd className={row.value ? "break-words whitespace-pre-line text-tfg/90" : "text-tfg/30"}>
                        {row.value ?? p.review.blank}
                      </dd>
                    </div>
                  ))}
                </dl>
                <button
                  type="button"
                  onClick={() => onEdit(section)}
                  className="mt-4 inline-flex h-9 items-center rounded-full px-4 text-[13px] text-tfg/85 ring-1 ring-tfg/20 transition-colors hover:bg-tfg/10"
                >
                  {p.review.edit}
                </button>
              </div>
            </details>
          );
        })}
      </div>

      <label
        className={`mt-8 flex items-start gap-3.5 text-[14px] leading-snug ${undone.length ? "opacity-50" : "cursor-pointer"}`}
      >
        <input
          type="checkbox"
          disabled={undone.length > 0}
          checked={draft.attestedAt !== null && undone.length === 0}
          onChange={(event) => {
            haptic(event.target.checked ? "success" : "selection");
            packetStore.attest(event.target.checked);
          }}
          className="mt-0.5 size-[18px] shrink-0 accent-[color:var(--t-sky)]"
        />
        <span>
          {p.review.attestLabel}
          {undone.length > 0 ? <span className="mt-1 block text-[12px] text-tfg/50">{p.review.attestLocked}</span> : null}
        </span>
      </label>

      {ready ? (
        <section
          aria-live="polite"
          className="mt-8 rounded-2xl p-5 ring-1 ring-[color:var(--t-sky)]/40"
          style={{ background: "linear-gradient(180deg, rgba(43,100,240,0.18), rgba(43,100,240,0.04))" }}
        >
          <h3 className={`${packetSerif.className} text-[20px] leading-tight`}>{p.review.readyTitle}</h3>
          <p className="mt-2 text-[13px] leading-relaxed text-tfg/70">{p.review.readyBody}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => void copySummary()}
              className="inline-flex h-10 items-center rounded-full bg-tfg px-5 text-[14px] font-medium text-tpill transition-transform active:scale-[0.97]"
            >
              {copied ? p.review.copied : p.review.copy}
            </button>
            <span className="text-[12px] text-tfg/50">{p.review.soon}</span>
          </div>
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => {
          if (window.confirm(p.review.clearConfirm)) {
            haptic("heavy");
            packetStore.clear();
          }
        }}
        className="mt-10 text-[12px] text-tfg/45 underline underline-offset-4 transition-colors hover:text-tfg/75"
      >
        {p.review.clear}
      </button>
    </div>
  );
}
