"use client";

import { useLocale } from "@/components/locale-provider";
import { LanguageSwitch } from "@/components/wallet/language-switch";
import { CARD_H } from "@/components/wallet/motion";
import { cardBackground, PALETTES } from "@/lib/ports";
import Link from "next/link";
import { useEffect, type CSSProperties } from "react";

const palette = PALETTES[0];

export function NotFoundScreen() {
  const { copy } = useLocale();

  useEffect(() => {
    document.title = copy.pageTitle(copy.notFoundTitle);
  }, [copy]);

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <div className="mb-8 flex justify-end">
        <LanguageSwitch />
      </div>

      <div className="relative" style={{ height: CARD_H + 28 }}>
        {[2, 1].map((layer) => (
          <div
            key={layer}
            aria-hidden
            className="rise absolute inset-x-0 bottom-0 rounded-3xl border border-dashed border-foreground/20 bg-surface/60"
            style={
              {
                "--i": 2 - layer,
                height: CARD_H,
                transform: `translateY(${-layer * 14}px) scale(${1 - layer * 0.05})`,
                transformOrigin: "50% 100%",
                opacity: 1 - layer * 0.3,
              } as CSSProperties
            }
          />
        ))}

        <div
          className="rise absolute inset-x-0 bottom-0 overflow-hidden rounded-3xl p-[18px] text-white"
          style={
            {
              "--i": 2,
              height: CARD_H,
              background: cardBackground(palette),
              boxShadow: `0 22px 40px -22px ${palette.to}, inset 0 1px 0 rgb(255 255 255 / 0.22)`,
            } as CSSProperties
          }
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "repeating-linear-gradient(115deg, rgb(255 255 255 / 0.04) 0 1px, transparent 1px 7px)",
            }}
          />
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0 pt-0.5">
              <p className="text-[19px] leading-[1.15] font-semibold tracking-[-0.02em]">
                {copy.notFoundCard}
              </p>
              <p className="mt-1 text-[13px] leading-none opacity-[0.72]">{copy.notFoundCrossing}</p>
            </div>
            <div className="text-right">
              <p className="text-[36px] leading-none font-semibold tracking-[-0.045em] tabular-nums">
                404
              </p>
              <p className="mt-1.5 flex items-center justify-end gap-1.5 text-[12px] leading-none font-medium opacity-[0.85]">
                <span className="size-1.5 rounded-full bg-zinc-400" />
                {copy.closed}
              </p>
            </div>
          </div>
          <div className="absolute inset-x-[18px] bottom-[18px]">
            <p className="text-[12px] leading-none font-medium opacity-[0.72]">{copy.notFoundRoute}</p>
            <p className="mt-1.5 text-[14px] leading-none font-medium">{copy.notFoundLanes}</p>
          </div>
        </div>
      </div>

      <div className="rise mt-10 text-center" style={{ "--i": 4 } as CSSProperties}>
        <h1 className="text-[28px] leading-tight font-bold tracking-[-0.03em]">{copy.notFoundHeadline}</h1>
        <p className="mx-auto mt-2 max-w-[34ch] text-[15px] leading-relaxed text-muted">{copy.notFoundBody}</p>
        <Link
          href="/"
          className="mt-6 inline-flex h-12 items-center rounded-full bg-accent px-6 text-[16px] font-semibold text-accent-ink transition-transform active:scale-[0.97]"
        >
          {copy.backToWallet}
        </Link>
      </div>
    </main>
  );
}
