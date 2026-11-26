import type { TramitesDocIcon, TramitesPathId } from "@/lib/tramites";
import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

/*
  Line illustrations for /tramites. Decorative only: every picture sits next to words that say
  the same thing. Lines take the text color; the one accent is --t-sky, and marks drawn on top of
  that accent use --t-bg so they read in both themes.
*/

const SKY = "var(--t-sky)";
const ON_SKY = "var(--t-bg)";
/** Matches the 4% tint of the frame the art sits in, so filled shapes hide what is behind them. */
const PANEL = { fill: "color-mix(in srgb, var(--t-fg) 4%, var(--t-bg))" };

function Art({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 120 80"
      className={cn("h-auto w-full", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export function ErrandArt({ id, className }: { id: TramitesPathId; className?: string }) {
  switch (id) {
    case "first":
      return (
        <Art className={className}>
          <rect x="38" y="9" width="40" height="60" rx="5" />
          <circle cx="58" cy="33" r="9" />
          <path d="M49 33h18M58 24c-3 3-3 15 0 18M58 24c3 3 3 15 0 18" strokeWidth="1.4" />
          <path d="M48 52h20M51 58h14" />
          <circle cx="84" cy="58" r="11" fill={SKY} stroke="none" />
          <path d="M84 52.5v11M78.5 58h11" stroke={ON_SKY} strokeWidth="2.4" />
        </Art>
      );
    case "card":
      return (
        <Art className={className}>
          <rect x="18" y="16" width="84" height="52" rx="7" />
          <rect x="26" y="27" width="20" height="25" rx="3" />
          <circle cx="36" cy="36" r="4" />
          <path d="M29.5 49c1.5-4 3.8-5.5 6.5-5.5s5 1.5 6.5 5.5" />
          <path d="M54 31h38M54 39h30M54 47h22" />
          <rect x="54" y="56" width="38" height="5" rx="2.5" fill={SKY} stroke="none" />
          <path d="M18 24h84" strokeWidth="1.2" opacity="0.4" />
        </Art>
      );
    case "renewal":
      return (
        <Art className={className}>
          <rect x="22" y="16" width="64" height="42" rx="6" />
          <rect x="29" y="25" width="15" height="18" rx="2.5" />
          <path d="M51 28h27M51 35h21M51 42h15" />
          <circle cx="86" cy="56" r="14" fill={SKY} stroke="none" />
          <path d="M92 52a7 7 0 1 0 1 6" stroke={ON_SKY} strokeWidth="2.2" />
          <path d="M93 46v6.5h-6.5" stroke={ON_SKY} strokeWidth="2.2" />
        </Art>
      );
    case "lost":
      return (
        <Art className={className}>
          <rect x="18" y="16" width="62" height="42" rx="6" strokeDasharray="5 5" opacity="0.7" />
          <path d="M28 28h20M28 36h14" opacity="0.5" />
          <circle cx="78" cy="48" r="14" fill={SKY} fillOpacity="0.18" />
          <path d="M88 58l12 12" strokeWidth="4" />
          <path d="M74.5 44.5a4 4 0 1 1 5.2 3.8c-1 .3-1.7 1.2-1.7 2.2v.7M78 55v.2" strokeWidth="2.2" />
        </Art>
      );
  }
}

/** One picture per "how it works" step: pick an errand, gather papers, finish on the official site. */
export function StepArt({ index, className }: { index: number; className?: string }) {
  if (index === 0) {
    return (
      <Art className={className}>
        <rect x="16" y="12" width="58" height="14" rx="7" />
        <rect x="16" y="33" width="58" height="14" rx="7" fill={SKY} stroke="none" />
        <rect x="16" y="54" width="58" height="14" rx="7" />
        <path d="M24 19h24M24 61h18" opacity="0.5" />
        <path d="M24 40h30" stroke={ON_SKY} />
        <path
          d="M78 34v26l6.5-6 4.5 9.5 4.5-2-4.5-9.5h9z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </Art>
    );
  }
  if (index === 1) {
    return (
      <Art className={className}>
        <path d="M22 24h22l6 6h48v38H22z" />
        <rect x="34" y="14" width="28" height="34" rx="3" transform="rotate(-7 48 31)" style={PANEL} strokeOpacity="0.6" />
        <rect x="54" y="11" width="28" height="34" rx="3" style={PANEL} />
        <path d="M60 20h16M60 27h16" />
        <path d="M22 40h76v28H22z" style={PANEL} />
        <circle cx="90" cy="62" r="11" fill={SKY} stroke="none" />
        <path d="M85 62l3.5 3.5 6.5-7" stroke={ON_SKY} strokeWidth="2.4" />
      </Art>
    );
  }
  return (
    <Art className={className}>
      <rect x="16" y="10" width="88" height="56" rx="6" />
      <path d="M16 21h88" />
      <path d="M23 15.5h.1M29 15.5h.1M35 15.5h.1" strokeWidth="3" />
      <path d="M26 31h40M26 39h40M26 47h26" opacity="0.6" />
      <rect x="26" y="53" width="24" height="7" rx="3.5" fill={SKY} stroke="none" />
      <circle cx="86" cy="42" r="12" fill={SKY} stroke="none" />
      <path d="M80.5 42l3.8 3.8 7.2-7.6" stroke={ON_SKY} strokeWidth="2.4" />
    </Art>
  );
}

function Glyph({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={cn("shrink-0", className ?? "size-5")}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

const DOC_PATHS: Record<TramitesDocIcon, ReactNode> = {
  passport: (
    <>
      <rect x="6" y="3" width="12" height="18" rx="2" />
      <circle cx="12" cy="10.5" r="3" />
      <path d="M9 17h6" />
    </>
  ),
  passports: (
    <>
      <rect x="4" y="5" width="11" height="16" rx="2" opacity="0.55" />
      <rect x="9" y="3" width="11" height="16" rx="2" />
      <circle cx="14.5" cy="9.5" r="2.5" />
      <path d="M12 15h5" />
    </>
  ),
  barcode: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M8.5 7h7M8.5 10h5" />
      <path d="M8.5 13.5v4M10.5 13.5v4M12 13.5v4M14 13.5v4M15.5 13.5v4" strokeWidth="1.2" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5.5" width="16" height="15" rx="2" />
      <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
      <path d="M9 15l2 2 4-4" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 3h12v18l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5L6 21z" />
      <path d="M9 8h6M9 11.5h6" />
      <path d="M12 14v3" />
    </>
  ),
  photo: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <circle cx="12" cy="10" r="2.8" />
      <path d="M7.5 18c1-2.6 2.6-3.8 4.5-3.8s3.5 1.2 4.5 3.8" />
    </>
  ),
  folder: (
    <>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M8 13h8" />
    </>
  ),
  card: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <rect x="5.5" y="8.5" width="4.5" height="5.5" rx="1" />
      <path d="M12.5 9.5h6M12.5 12.5h4" />
    </>
  ),
  copy: (
    <>
      <rect x="3" y="4" width="14" height="10" rx="2" opacity="0.55" />
      <rect x="7" y="9" width="14" height="10" rx="2" />
      <path d="M10 13h5M10 15.5h3" />
    </>
  ),
  report: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M8.5 12h7M8.5 15h4" />
      <circle cx="15.5" cy="17" r="1.6" />
    </>
  ),
  child: (
    <>
      <circle cx="8.5" cy="6" r="2.5" />
      <path d="M4.5 20v-5a4 4 0 0 1 8 0v5" />
      <circle cx="17" cy="10" r="2" />
      <path d="M14 20v-3a3 3 0 0 1 6 0v3" />
    </>
  ),
  form: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M8.5 12h4M8.5 15.5h3" />
      <path d="M14.5 17.5l4-4 1.5 1.5-4 4h-1.5z" />
    </>
  ),
  building: (
    <>
      <path d="M3 9.5L12 4l9 5.5M4 20h16M5 10.5V18M9.5 10.5V18M14.5 10.5V18M19 10.5V18" />
    </>
  ),
  warning: (
    <>
      <path d="M12 3.5 21.5 20h-19z" />
      <path d="M12 10v4.5M12 17.2v.1" />
    </>
  ),
};

/** A small picture of one document or place, so the row reads at a glance. */
export function DocGlyph({ kind, className }: { kind: TramitesDocIcon; className?: string }) {
  return <Glyph className={className}>{DOC_PATHS[kind]}</Glyph>;
}
