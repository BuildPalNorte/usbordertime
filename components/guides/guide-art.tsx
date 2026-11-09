import { useId, type ReactNode } from "react";

/**
 * Flat, theme-aware illustrations for the guides. Drawn with the page's own color tokens so they
 * follow light and dark. Motion lives in globals.css (`.art-*`) and stops for reduced motion.
 */

export type GuideScene = "gauge" | "chart" | "lanes" | "truck" | "walk" | "bridge";
type Region = "mx" | "ca";

const SCENES: Record<string, GuideScene> = {
  "read-a-wait": "gauge",
  estimate: "gauge",
  "border-congestion": "chart",
  "best-time": "chart",
  sentri: "lanes",
  nexus: "lanes",
  "ready-lane": "lanes",
  "truck-crossings": "truck",
  "walking-across": "walk",
};

const CANADA = new Set(["canada-border", "peace-arch", "detroit-windsor", "buffalo-niagara", "champlain", "nexus"]);

export function sceneFor(id: string): GuideScene {
  return SCENES[id] ?? "bridge";
}

export function regionFor(id: string): Region {
  return CANADA.has(id) ? "ca" : "mx";
}

const GOOD = "#2fa66a";
const MID = "#e8a53a";
const BAD = "#e0524a";

function Sky({ uid, dusk }: { uid: string; dusk?: boolean }) {
  return (
    <>
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--accent)" stopOpacity={dusk ? 0.38 : 0.3} />
          <stop offset="1" stopColor="var(--surface)" stopOpacity="1" />
        </linearGradient>
        <linearGradient id={`${uid}-road`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--surface-strong)" />
          <stop offset="1" stopColor="var(--line)" />
        </linearGradient>
      </defs>
      <rect width="640" height="240" fill={`url(#${uid}-sky)`} />
      <circle cx="552" cy="46" r="20" fill="var(--accent)" opacity="0.28" />
      <circle cx="552" cy="46" r="11" fill="var(--accent)" opacity="0.55" />
      <g className="art-cloud" opacity="0.9">
        <path d="M70 52 q8 -16 24 -8 q10 -14 26 0 q16 -2 14 12 H64 q-6 -2 6 -4 Z" fill="var(--surface)" />
      </g>
      <g className="art-cloud art-cloud-slow" opacity="0.8">
        <path d="M330 34 q8 -14 22 -7 q10 -12 24 0 q14 -2 12 10 H326 q-5 -2 4 -3 Z" fill="var(--surface)" />
      </g>
    </>
  );
}

function Car({
  x,
  y,
  accent,
  delay = 0,
  scale = 1,
  className = "art-car",
}: {
  x: number;
  y: number;
  accent?: boolean;
  delay?: number;
  scale?: number;
  className?: string;
}) {
  const body = accent ? "var(--accent)" : "var(--muted)";
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <g className={className} style={{ animationDelay: `${delay}ms` }}>
        <ellipse cx="25" cy="29" rx="26" ry="3" fill="var(--foreground)" opacity="0.12" />
        <path d="M0 22 Q0 12 8 10 L14 2 Q16 0 20 0 H32 Q36 0 38 2 L44 10 Q52 12 52 22 Z" fill={body} />
        <path d="M17 3 H25 V10 H12 Z M28 3 H33 L39 10 H28 Z" fill="var(--surface)" opacity="0.85" />
        <rect x="46" y="14" width="5" height="4" rx="2" fill="#ffd66b" />
        <circle cx="12" cy="24" r="5.5" fill="var(--foreground)" />
        <circle cx="12" cy="24" r="2" fill="var(--surface)" />
        <circle cx="40" cy="24" r="5.5" fill="var(--foreground)" />
        <circle cx="40" cy="24" r="2" fill="var(--surface)" />
      </g>
    </g>
  );
}

function Flag({ x, y, kind }: { x: number; y: number; kind: "us" | "mx" | "ca" }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <line x1="0" y1="0" x2="0" y2="34" stroke="var(--foreground)" strokeWidth="2" strokeLinecap="round" />
      <g className="art-flag">
        {kind === "us" && (
          <>
            <rect x="1" y="0" width="22" height="14" fill="#fff" />
            {[0, 4, 8, 12].map((o) => (
              <rect key={o} x="1" y={o} width="22" height="2" fill={BAD} />
            ))}
            <rect x="1" y="0" width="10" height="8" fill="#2b4a9a" />
          </>
        )}
        {kind === "mx" && (
          <>
            <rect x="1" y="0" width="8" height="14" fill="#1f8f5a" />
            <rect x="9" y="0" width="7" height="14" fill="#fff" />
            <rect x="16" y="0" width="7" height="14" fill={BAD} />
            <circle cx="12.5" cy="7" r="2" fill="#a4793a" />
          </>
        )}
        {kind === "ca" && (
          <>
            <rect x="1" y="0" width="6" height="14" fill={BAD} />
            <rect x="7" y="0" width="10" height="14" fill="#fff" />
            <rect x="17" y="0" width="6" height="14" fill={BAD} />
            <path d="M12 3 l1.4 3 2.4 -.8 -1.2 3 1.6 1.2 H8.8 l1.6 -1.2 -1.2 -3 2.4 .8 Z" fill={BAD} />
          </>
        )}
      </g>
    </g>
  );
}

function Booth({ x, y, label }: { x: number; y: number; label?: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="-8" y="-12" width="60" height="9" rx="4.5" fill="var(--accent)" />
      <rect x="2" y="-3" width="40" height="55" rx="6" fill="var(--surface)" stroke="var(--foreground)" strokeWidth="2" />
      <rect x="8" y="6" width="28" height="18" rx="4" fill="var(--accent)" opacity="0.28" />
      <circle cx="16" cy="15" r="3.5" fill="var(--foreground)" opacity="0.7" />
      <rect x="40" y="38" width="46" height="5" rx="2.5" fill="var(--foreground)" className="art-gate" />
      {label ? (
        <text x="22" y="44" textAnchor="middle" fontSize="9" fontWeight="800" fill="var(--foreground)">
          {label}
        </text>
      ) : null}
    </g>
  );
}

function Road({ y, uid }: { y: number; uid: string }) {
  return (
    <g>
      <rect x="0" y={y} width="640" height={240 - y} fill={`url(#${uid}-road)`} />
      <rect x="0" y={y} width="640" height="3" fill="var(--foreground)" opacity="0.15" />
      <line
        x1="0"
        x2="640"
        y1={y + 28}
        y2={y + 28}
        stroke="var(--surface)"
        strokeWidth="3"
        strokeDasharray="22 16"
        className="art-road"
        opacity="0.9"
      />
    </g>
  );
}

function Skyline({ x, flip, variant }: { x: number; flip?: boolean; variant: "city" | "pines" }) {
  const b = [
    [0, 62, 24],
    [28, 92, 20],
    [52, 48, 26],
    [82, 74, 18],
  ] as const;
  return (
    <g transform={flip ? `translate(${x + 104} 0) scale(-1 1)` : `translate(${x} 0)`} opacity="0.95">
      {variant === "city" ? (
        b.map(([dx, h, w]) => (
          <g key={dx}>
            <rect x={dx} y={178 - h} width={w} height={h} rx="3" fill="var(--surface)" stroke="var(--foreground)" strokeWidth="1.5" strokeOpacity="0.5" />
            {Array.from({ length: Math.floor(h / 18) }).map((_, i) => (
              <rect key={i} x={dx + 5} y={178 - h + 8 + i * 16} width={w - 10} height="5" rx="2" fill="var(--accent)" opacity="0.4" />
            ))}
          </g>
        ))
      ) : (
        <>
          {[0, 26, 52, 78].map((dx, i) => (
            <path
              key={dx}
              d={`M${dx} 178 L${dx + 14} ${120 - i * 6} L${dx + 28} 178 Z`}
              fill={GOOD}
              opacity={0.55 + i * 0.1}
            />
          ))}
          <path d="M-10 178 L40 112 L72 150 L98 126 L130 178 Z" fill="var(--muted)" opacity="0.28" />
        </>
      )}
    </g>
  );
}

function Gauge({ uid }: { uid: string }) {
  // Half-dial with three bands, a needle, and the queue on the way to the booth.
  const arc = (a0: number, a1: number, color: string) => {
    const r = 76;
    const p = (a: number) => [Math.cos(Math.PI - (a * Math.PI) / 180) * r, -Math.sin(Math.PI - (a * Math.PI) / 180) * r + 0];
    const [x0, y0] = p(a0);
    const [x1, y1] = p(a1);
    return <path d={`M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`} fill="none" stroke={color} strokeWidth="16" />;
  };
  return (
    <>
      <Sky uid={uid} />
      <Road y={176} uid={uid} />
      <Car x={30} y={182} delay={0} />
      <Car x={96} y={182} accent delay={250} />
      <Booth x={210} y={126} />
      <g transform="translate(440 150)">
        <path d="M-98 0 A98 98 0 0 1 98 0 Z" fill="var(--surface)" opacity="0.6" />
        {arc(0, 58, GOOD)}
        {arc(62, 118, MID)}
        {arc(122, 180, BAD)}
        <g className="art-needle">
          <line x1="0" y1="0" x2="-58" y2="0" stroke="var(--foreground)" strokeWidth="5" strokeLinecap="round" />
        </g>
        <circle r="9" fill="var(--foreground)" />
        <circle r="3.5" fill="var(--surface)" />
        <text x="-76" y="22" textAnchor="middle" fontSize="11" fontWeight="800" fill="var(--muted)">15</text>
        <text x="76" y="22" textAnchor="middle" fontSize="11" fontWeight="800" fill="var(--muted)">45+</text>
      </g>
    </>
  );
}

function Chart({ uid }: { uid: string }) {
  const bars = [26, 38, 66, 98, 126, 104, 76, 58, 92, 120, 78, 40];
  const peak = bars.indexOf(Math.max(...bars));
  return (
    <>
      <Sky uid={uid} dusk />
      <g transform="translate(0 6)">
        <line x1="50" x2="590" y1="196" y2="196" stroke="var(--foreground)" strokeWidth="2.5" strokeLinecap="round" />
        {[60, 100, 140].map((h) => (
          <line key={h} x1="50" x2="590" y1={196 - h} y2={196 - h} stroke="var(--foreground)" strokeOpacity="0.12" strokeDasharray="4 6" />
        ))}
        {bars.map((h, i) => (
          <rect
            key={i}
            className="art-bar"
            style={{ animationDelay: `${i * 60}ms` }}
            x={66 + i * 43}
            y={196 - h}
            width="28"
            height={h}
            rx="8"
            fill={h >= 118 ? BAD : h >= 90 ? MID : "var(--accent)"}
            opacity={h >= 90 ? 1 : 0.55}
          />
        ))}
        <g transform={`translate(${80 + peak * 43} ${196 - bars[peak] - 28})`}>
          <rect x="-26" y="-4" width="52" height="20" rx="10" fill="var(--foreground)" />
          <path d="M-5 16 L0 22 L5 16 Z" fill="var(--foreground)" />
          <text x="0" y="10" textAnchor="middle" fontSize="10" fontWeight="800" fill="var(--surface)">PEAK</text>
        </g>
        {[0, 3, 6, 9].map((i) => (
          <text key={i} x={80 + i * 43 * 1} y="214" textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--muted)">
            {["6a", "9a", "12p", "3p"][i / 3]}
          </text>
        ))}
      </g>
    </>
  );
}

function Lanes({ uid, region }: { uid: string; region: Region }) {
  const lanes = [
    { x: 160, label: region === "ca" ? "NEXUS" : "SENTRI", accent: true, cars: 1 },
    { x: 320, label: "READY", accent: false, cars: 2 },
    { x: 480, label: "GENERAL", accent: false, cars: 4 },
  ];
  return (
    <>
      <Sky uid={uid} />
      <rect y="70" width="640" height="170" fill={`url(#${uid}-road)`} />
      {lanes.map((lane) => (
        <g key={lane.label}>
          <rect x={lane.x - 52} y="70" width="104" height="170" fill="var(--foreground)" opacity="0.06" />
          <line x1={lane.x - 52} x2={lane.x - 52} y1="70" y2="240" stroke="var(--surface)" strokeWidth="3" />
          <line x1={lane.x} x2={lane.x} y1="78" y2="236" stroke="var(--surface)" strokeWidth="2" strokeDasharray="14 12" opacity="0.6" className="art-road-v" />
          <line x1={lane.x} x2={lane.x} y1="40" y2="70" stroke="var(--foreground)" strokeWidth="3" />
          <rect x={lane.x - 44} y="12" width="88" height="30" rx="15" fill={lane.accent ? "var(--accent)" : "var(--surface)"} stroke={lane.accent ? "none" : "var(--foreground)"} strokeWidth="2" />
          <text x={lane.x} y="32" textAnchor="middle" fontSize="12" fontWeight="800" letterSpacing="0.6" fill={lane.accent ? "var(--accent-ink)" : "var(--foreground)"}>
            {lane.label}
          </text>
          {Array.from({ length: lane.cars }).map((_, i) => (
            <g key={i} transform={`translate(${lane.x + 14} ${90 + i * 42}) rotate(90) scale(0.62)`}>
              <g className="art-car-v" style={{ animationDelay: `${i * 200}ms` }}>
                <path d="M0 22 Q0 12 8 10 L14 2 Q16 0 20 0 H32 Q36 0 38 2 L44 10 Q52 12 52 22 Z" fill={lane.accent ? "var(--accent)" : "var(--muted)"} />
                <path d="M17 3 H25 V10 H12 Z M28 3 H33 L39 10 H28 Z" fill="var(--surface)" opacity="0.85" />
              </g>
            </g>
          ))}
        </g>
      ))}
    </>
  );
}

function Truck({ uid }: { uid: string }) {
  return (
    <>
      <Sky uid={uid} />
      <Road y={170} uid={uid} />
      <g transform="translate(90 96)">
        <g className="art-car">
          <ellipse cx="140" cy="84" rx="150" ry="4" fill="var(--foreground)" opacity="0.12" />
          <rect x="0" y="0" width="190" height="70" rx="8" fill="var(--accent)" />
          <rect x="12" y="12" width="166" height="7" rx="3.5" fill="var(--accent-ink)" opacity="0.35" />
          <rect x="12" y="26" width="110" height="7" rx="3.5" fill="var(--accent-ink)" opacity="0.35" />
          <path d="M198 24 H240 Q252 24 258 38 L270 52 V70 H198 Z" fill="var(--muted)" />
          <path d="M206 30 H236 L250 48 H206 Z" fill="var(--surface)" opacity="0.85" />
          <rect x="262" y="58" width="8" height="6" rx="3" fill="#ffd66b" />
          {[38, 96, 156, 232].map((cx) => (
            <g key={cx}>
              <circle cx={cx} cy="72" r="13" fill="var(--foreground)" />
              <circle cx={cx} cy="72" r="5" fill="var(--surface)" />
            </g>
          ))}
        </g>
      </g>
      <Booth x={470} y={114} label="FAST" />
    </>
  );
}

function Walk({ uid }: { uid: string }) {
  const people = [
    { dx: 0, color: "var(--muted)", d: 0 },
    { dx: 74, color: "var(--accent)", d: 250 },
    { dx: 148, color: "var(--muted)", d: 500 },
  ];
  return (
    <>
      <Sky uid={uid} />
      <rect x="0" y="176" width="640" height="64" fill={`url(#${uid}-road)`} />
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
        <rect key={i} x={20 + i * 62} y="196" width="36" height="9" rx="2" fill="var(--surface)" opacity="0.8" />
      ))}
      <g transform="translate(70 0)">
        {people.map((p) => (
          <g key={p.dx} transform={`translate(${p.dx} 0)`}>
            <g className="art-walker" style={{ animationDelay: `${p.d}ms` }}>
              <ellipse cx="30" cy="176" rx="18" ry="3.5" fill="var(--foreground)" opacity="0.14" />
              <circle cx="30" cy="84" r="13" fill="#e2b48a" />
              <path d="M17 82 Q30 66 43 82 Q30 76 17 82 Z" fill="var(--foreground)" />
              <rect x="18" y="100" width="24" height="46" rx="11" fill={p.color} />
              <rect x="20" y="142" width="8" height="32" rx="4" fill="var(--foreground)" />
              <rect x="32" y="142" width="8" height="32" rx="4" fill="var(--foreground)" />
            </g>
          </g>
        ))}
      </g>
      <g transform="translate(446 58)">
        <rect x="0" y="0" width="140" height="120" rx="14" fill="var(--surface)" stroke="var(--foreground)" strokeWidth="2" />
        <rect x="0" y="0" width="140" height="28" rx="14" fill="var(--accent)" />
        <rect x="0" y="14" width="140" height="14" fill="var(--accent)" />
        <rect x="14" y="44" width="46" height="58" rx="6" fill="var(--accent)" opacity="0.2" />
        <circle cx="37" cy="64" r="9" fill="var(--accent)" opacity="0.7" />
        <rect x="70" y="50" width="54" height="7" rx="3.5" fill="var(--foreground)" opacity="0.5" />
        <rect x="70" y="66" width="40" height="7" rx="3.5" fill="var(--foreground)" opacity="0.3" />
        <path d="M76 92 L86 102 L110 80" fill="none" stroke={GOOD} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </>
  );
}

function Bridge({ uid, region }: { uid: string; region: Region }) {
  const far = region === "ca" ? "ca" : "mx";
  return (
    <>
      <Sky uid={uid} />
      <Skyline x={16} variant={region === "ca" ? "pines" : "city"} />
      <Skyline x={520} flip variant={region === "ca" ? "pines" : "city"} />
      <path d="M0 178 H640 V240 H0 Z" fill="var(--accent)" opacity="0.22" />
      {[0, 1, 2].map((i) => (
        <path key={i} className="art-wave" style={{ animationDelay: `${i * 500}ms` }} d={`M${60 + i * 190} ${204 + (i % 2) * 14} q10 -6 20 0 t20 0 t20 0`} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
      ))}
      <path d="M110 178 Q320 96 530 178" fill="none" stroke="var(--foreground)" strokeWidth="4" strokeLinecap="round" />
      {[170, 220, 270, 320, 370, 420, 470].map((x) => {
        const t = (x - 110) / 420;
        const y = 178 - 4 * 41 * t * (1 - t);
        return <line key={x} x1={x} x2={x} y1={y} y2="168" stroke="var(--foreground)" strokeOpacity="0.4" strokeWidth="1.8" />;
      })}
      <rect x="100" y="164" width="440" height="14" rx="7" fill="var(--muted)" />
      <rect x="100" y="164" width="440" height="3" rx="1.5" fill="var(--surface)" opacity="0.6" />
      <rect x="130" y="178" width="12" height="40" fill="var(--foreground)" opacity="0.55" />
      <rect x="498" y="178" width="12" height="40" fill="var(--foreground)" opacity="0.55" />
      <g className="art-drive">
        <Car x={170} y={141} accent scale={0.78} />
        <Car x={270} y={141} delay={350} scale={0.78} />
        <Car x={380} y={141} delay={700} scale={0.78} />
      </g>
      <Flag x={92} y={108} kind="us" />
      <Flag x={548} y={108} kind={far} />
    </>
  );
}

const SCENE_ART: Record<GuideScene, (props: { uid: string; region: Region }) => ReactNode> = {
  gauge: Gauge,
  chart: Chart,
  lanes: Lanes,
  truck: Truck,
  walk: Walk,
  bridge: Bridge,
};

/** Decorative hero art. Hidden from assistive tech: the text carries the meaning. */
export function GuideArt({ id, className }: { id: string; className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const Scene = SCENE_ART[sceneFor(id)];
  return (
    <svg
      viewBox="0 0 640 240"
      role="presentation"
      aria-hidden
      focusable="false"
      className={className}
      preserveAspectRatio="xMidYMid slice"
    >
      <Scene uid={uid} region={regionFor(id)} />
    </svg>
  );
}
