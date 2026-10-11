"use client";

import { LocaleProvider } from "@/components/locale-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { InstallSheet } from "@/components/wallet/install-prompt";
import { PortraitLock } from "@/components/wallet/portrait-lock";
import type { Locale } from "@/lib/i18n";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

export function Providers({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: true } },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <LocaleProvider locale={locale}>
          <PortraitLock />
          {children}
          <InstallSheet />
        </LocaleProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
