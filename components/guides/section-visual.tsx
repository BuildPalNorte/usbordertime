import type { Locale } from "@/lib/i18n";
import type { GuideSection } from "@/lib/guides";
import type { ReactNode } from "react";

/**
 * Small visuals for one guide section, picked from its own words: an icon, chips for the lanes and
 * numbers it names, and a clear/moderate/long bar when it explains the bands. No live wait.
 */

type Icon = "lanes" | "blank" | "gauge" | "clock" | "chart" | "truck" | "walk" | "swap" | "card" | "bookmark" | "pin";

const GOOD = "#2fa66a";
const MID = "#e8a53a";
const BAD = "#e0524a";

const RULES: [RegExp, Icon][] = [
  [/blank|espacio en blanco|\bzero\b|\bcero\b/, "blank"],
  [/counts as long|qu[eé] cuenta|colou?r|moderate|moderada/, "gauge"],
  [/usual|average|promedio|\bhigh\b|m[aá]ximo|quiet|tranquilo|peak|pico|rush|congest/, "chart"],
  [/\bhour\b|\bhora\b|\btime\b|\bwhen\b|cuando|cu[aá]ndo|early|temprano|night|noche|weekend|fin de semana/, "clock"],
  [/truck|cami[oó]n|commercial|comercial|\bfast\b|cargo|carga/, "truck"],
  [/walk|pedestri|peat[oó]n|peatonal|foot|caminando|a pie/, "walk"],
  [/switch|cambiar|compar|choos|elegir|between|entre|which name|cu[aá]l es cu[aá]l/, "swap"],
  [/sentri|nexus|ready|trusted|enrol|apply|solicit|card|tarjeta|inscri|membres|membership/, "card"],
  [/sav|guarda|bookmark|marcador/, "bookmark"],
  [/lane|carril|six|seis/, "lanes"],
];

export function iconFor(section: GuideSection): Icon {
  const head = section.heading.toLowerCase();
  for (const [re, icon] of RULES) if (re.test(head)) return icon;
  return "pin";
}

function Glyph({ icon }: { icon: Icon }): ReactNode {
  const s = { fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  switch (icon) {
    case "lanes":
      return (
        <>
          <path d="M8 26 L12 6 M24 26 L20 6" {...s} />
          <path d="M16 24 V20 M16 15 V11" {...s} />
        </>
      );
    case "blank":
      return (
        <>
          <circle cx="16" cy="16" r="10" {...s} strokeDasharray="3 4" />
          <path d="M13 13 q0 -3.5 3.2 -3.5 q3 0 3 3 q0 2 -2.5 3 v1.5 M16 22 v.1" {...s} />
        </>
      );
    case "gauge":
      return (
        <>
          <path d="M5 22 A11 11 0 0 1 27 22" {...s} />
          <path d="M16 22 L21 14" {...s} />
          <circle cx="16" cy="22" r="1.6" fill="currentColor" />
        </>
      );
    case "clock":
      return (
        <>
          <circle cx="16" cy="16" r="10" {...s} />
          <path d="M16 10 V16 L20 19" {...s} />
        </>
      );
    case "chart":
      return <path d="M6 26 V16 M13 26 V8 M20 26 V14 M27 26 V10" {...s} strokeWidth={4} />;
    case "truck":
      return (
        <>
          <path d="M3 9 H19 V21 H3 Z M19 13 H25 L29 17 V21 H19" {...s} />
          <circle cx="9" cy="23" r="2.4" fill="currentColor" />
          <circle cx="23" cy="23" r="2.4" fill="currentColor" />
        </>
      );
    case "walk":
      return (
        <>
          <circle cx="16" cy="7" r="2.8" fill="currentColor" />
          <path d="M16 11 V19 L12 27 M16 19 L21 27 M10 15 L16 12 L22 16" {...s} />
        </>
      );
    case "swap":
      return <path d="M5 11 H25 M21 6 L26 11 L21 16 M27 22 H7 M11 17 L6 22 L11 27" {...s} />;
    case "card":
      return (
        <>
          <rect x="4" y="8" width="24" height="16" rx="3" {...s} />
          <circle cx="11" cy="16" r="2.6" {...s} />
          <path d="M17 14 H24 M17 18 H22" {...s} />
        </>
      );
    case "bookmark":
      return <path d="M9 5 H23 V27 L16 21 L9 27 Z" {...s} />;
    default:
      return (
        <>
          <path d="M16 28 C9 20 7 16 7 12 A9 9 0 0 1 25 12 C25 16 23 20 16 28 Z" {...s} />
          <circle cx="16" cy="12" r="3" {...s} />
        </>
      );
  }
}

export function SectionIcon({ section, index }: { section: GuideSection; index: number }) {
  const icon = iconFor(section);
  const tint = index % 2 === 0;
  return (
    <span
      aria-hidden
      className={
        "grid size-12 shrink-0 place-items-center rounded-2xl sm:size-14 " +
        (tint ? "bg-accent text-accent-ink" : "bg-surface-strong text-accent ring-1 ring-line")
      }
    >
      <svg viewBox="0 0 32 32" className="size-7 sm:size-8">
        <Glyph icon={icon} />
      </svg>
    </span>
  );
}

type Term = { re: RegExp; label: Record<Locale, string>; tone: "accent" | "good" | "mid" | "bad" | "plain" };

const TERMS: Term[] = [
  { re: /SENTRI/, label: { en: "SENTRI", es: "SENTRI" }, tone: "accent" },
  { re: /NEXUS/, label: { en: "NEXUS", es: "NEXUS" }, tone: "accent" },
  { re: /Ready Lane|carril Ready/i, label: { en: "Ready Lane", es: "Carril Ready" }, tone: "good" },
  { re: /\bFAST\b/, label: { en: "FAST", es: "FAST" }, tone: "mid" },
  { re: /commercial|comercial/i, label: { en: "Commercial", es: "Comercial" }, tone: "plain" },
  { re: /pedestrian|peatonal/i, label: { en: "Pedestrian", es: "Peatonal" }, tone: "plain" },
];

const DOT: Record<Term["tone"], string> = {
  accent: "var(--accent)",
  good: GOOD,
  mid: MID,
  bad: BAD,
  plain: "var(--muted)",
};

function minutes(text: string): string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(/\b(\d{1,3})(?:\s*(?:to|a|–|-)\s*(\d{1,3}))?\s*(?:minutes|minutos|min)\b/gi)) {
    found.add(match[2] ? `${match[1]}–${match[2]} min` : `${match[1]} min`);
  }
  return [...found].slice(0, 3);
}

export function SectionChips({ section, locale }: { section: GuideSection; locale: Locale }) {
  const text = section.paragraphs.join(" ");
  const tags = TERMS.filter((term) => term.re.test(text)).slice(0, 4);
  const mins = minutes(text);
  if (tags.length === 0 && mins.length === 0) return null;
  return (
    <ul className="mt-4 flex flex-wrap gap-2" aria-hidden>
      {tags.map((tag) => (
        <li key={tag.label.en} className="inline-flex items-center gap-1.5 rounded-full bg-surface-strong px-3 py-1.5 text-[12.5px] font-semibold ring-1 ring-line">
          <span className="size-2 rounded-full" style={{ background: DOT[tag.tone] }} />
          {tag.label[locale]}
        </li>
      ))}
      {mins.map((m) => (
        <li key={m} className="inline-flex items-center gap-1.5 rounded-full bg-accent/12 px-3 py-1.5 font-mono text-[12.5px] font-semibold text-accent ring-1 ring-accent/25">
          <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="8" cy="8" r="6" />
            <path d="M8 4.5 V8 L10.5 9.5" />
          </svg>
          {m}
        </li>
      ))}
    </ul>
  );
}

/** Clear / moderate / long, drawn when a section names both thresholds. */
export function BandBar({ section, locale }: { section: GuideSection; locale: Locale }) {
  const text = section.paragraphs.join(" ");
  if (!/\b15\b/.test(text) || !/\b45\b/.test(text) || !/minut/i.test(text)) return null;
  const names =
    locale === "es"
      ? [
          ["Libre", "≤ 15 min", GOOD, "15fr"],
          ["Moderada", "16–45", MID, "30fr"],
          ["Larga", "45+", BAD, "25fr"],
        ]
      : [
          ["Clear", "≤ 15 min", GOOD, "15fr"],
          ["Moderate", "16–45", MID, "30fr"],
          ["Long", "45+", BAD, "25fr"],
        ];
  return (
    <div aria-hidden className="mt-5 grid gap-1.5" style={{ gridTemplateColumns: names.map((n) => n[3]).join(" ") }}>
      {names.map(([name, range, color]) => (
        <div key={name} className="min-w-0">
          <div className="band-fill h-3 rounded-full" style={{ background: color }} />
          <p className="mt-1.5 truncate text-[12px] font-bold">{name}</p>
          <p className="font-mono text-[11px] text-muted">{range}</p>
        </div>
      ))}
    </div>
  );
}
