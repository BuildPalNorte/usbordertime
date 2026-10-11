"use client";

import { LocaleProvider } from "@/components/locale-provider";
import { ThemeProvider } from "@/components/theme-provider";
import type { Locale } from "@/lib/i18n";
import type { ThemeChoice } from "@/lib/theme";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

export function Providers({
  locale,
  theme,
  children,
}: {
  locale: Locale;
  theme: ThemeChoice | null;
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
      <ThemeProvider theme={theme}>
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
