"use client";

import { COPY, LOCALE_COOKIE, type Locale } from "@/lib/i18n";
import { EXCHANGE_PATH } from "@/lib/routes";
import { localeStore } from "@/lib/locale-store";
import { createContext, useCallback, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";

const LocaleContext = createContext<Locale>("en");

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const getSnapshot = useCallback(() => localeStore.getSnapshot(locale), [locale]);
  const getServerSnapshot = useCallback(() => locale, [locale]);
  const live = useSyncExternalStore(localeStore.subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    document.documentElement.lang = live;
    document.cookie = `${LOCALE_COOKIE}=${live}; Path=/; Max-Age=31536000; SameSite=Lax`;
    const exchange = window.location.pathname === EXCHANGE_PATH;
    const description = document.querySelector('meta[name="description"]');
    if (description) {
      description.setAttribute(
        "content",
        exchange ? COPY[live].exchangeSeoDescription : COPY[live].metaDescription,
      );
    }
    if (exchange) document.title = COPY[live].pageTitle(COPY[live].exchangeSeoTitle);
  }, [live]);

  return <LocaleContext.Provider value={live}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const locale = useContext(LocaleContext);
  return {
    locale,
    copy: COPY[locale],
    setLocale: localeStore.set,
  };
}
