import { crossingPreview } from "@/lib/crossing-preview";
import { modeName, placeSubtitle, presentClock, waitLabel } from "@/lib/i18n";
import { cardBackground, paletteFor, portName, readLane, type Tone } from "@/lib/ports";
import { localeQuery } from "@/lib/routes";
import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const size = { width: 1200, height: 630 };

const TONE_COLOR: Record<Tone, string> = {
  clear: "#34d399",
  busy: "#fbbf24",
  slow: "#fb7185",
  closed: "#a1a1aa",
  unknown: "#a1a1aa",
};

export async function GET(request: NextRequest, context: { params: Promise<{ port: string }> }) {
  const { port } = await context.params;
  const locale = localeQuery(request.nextUrl.searchParams.get("lang")) ?? "en";
  const preview = await crossingPreview(port, request.nextUrl.searchParams.get("lane"), locale);
  if (!preview) return new Response("Not found", { status: 404 });

  const { copy, mode } = preview;
  const palette = paletteFor(preview.port.portNumber);
  const name = portName(preview.port);
  const reading = readLane(preview.port, mode);
  const light = palette.ink === "light";
  const ink = light ? "#ffffff" : "#10131a";
  const muted = light ? "rgba(255,255,255,0.72)" : "rgba(16,19,26,0.62)";
  const lane = modeName(mode, preview.port, copy);
  const place = placeSubtitle(name, copy);
  const clock = reading.reportedAt ? presentClock(reading.reportedAt, locale) : null;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: cardBackground(palette),
        color: ink,
        padding: "76px",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", fontSize: 30, letterSpacing: -0.4 }}>Border Time</div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            borderRadius: 999,
            padding: "12px 22px",
            background: light ? "rgba(255,255,255,0.16)" : "rgba(16,19,26,0.08)",
            fontSize: 28,
          }}
        >
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 99,
              background: TONE_COLOR[reading.tone],
              marginRight: 12,
            }}
          />
          {lane}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <div
            style={{
              display: "flex",
              fontSize: reading.minutes !== null ? 176 : 84,
              lineHeight: 0.9,
              letterSpacing: reading.minutes !== null ? -8 : -2,
            }}
          >
            {reading.minutes !== null ? String(reading.minutes) : waitLabel(reading, copy)}
          </div>
          {reading.minutes !== null ? (
            <div style={{ display: "flex", fontSize: 48, marginLeft: 18, marginBottom: 16, color: muted }}>
              {copy.minuteUnit}
            </div>
          ) : null}
        </div>
        <div style={{ display: "flex", fontSize: 64, marginTop: 36, letterSpacing: -1.5 }}>
          {name.title}
        </div>
        <div style={{ display: "flex", fontSize: 32, marginTop: 14, color: muted }}>
          {clock ? `${place} · ${copy.reported} ${clock}` : place}
        </div>
      </div>
    </div>,
    {
      ...size,
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      },
    },
  );
}
