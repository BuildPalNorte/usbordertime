"use client";

import { useLocale } from "@/components/locale-provider";
import Image from "next/image";
import type { ReactNode } from "react";

/**
 * The usbt picture, small, with the name people say under it, lined up on the left.
 * The name is the same in both languages.
 */
export function BrandLockup() {
  const { copy } = useLocale();
  return (
    <div className="flex shrink-0 flex-col items-start gap-1">
      <Image
        src="/usbt-logo.png"
        alt=""
        width={303}
        height={128}
        priority
        className="brand-logo h-5 w-auto"
      />
      <p className="text-[13px] leading-none font-semibold tracking-[0.01em] text-nowrap">
        {copy.brandName}
      </p>
    </div>
  );
}

/** Top bar for screens outside the wallet. The mark stays left; the switches stay right. */
export function BrandBar({ children }: { children?: ReactNode }) {
  return (
    <header className="mx-auto flex w-full max-w-md shrink-0 items-center justify-between gap-3 px-4 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6">
      <BrandLockup />
      {children ? <div className="flex shrink-0 items-center gap-2">{children}</div> : null}
    </header>
  );
}
