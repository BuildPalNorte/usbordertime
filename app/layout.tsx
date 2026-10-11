import { Providers } from "@/components/providers";
import { ShellSkeleton } from "@/components/wallet/shell-skeleton";
import { COPY, LOCALE_COOKIE } from "@/lib/i18n";
import { resolveLocale } from "@/lib/locale.server";
import { THEME_COLOR, THEME_COOKIE } from "@/lib/theme";
import { resolveTheme } from "@/lib/theme.server";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense, type ReactNode } from "react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Border Time",
  description: COPY.en.metaDescription,
  applicationName: "Border Time",
  appleWebApp: {
    capable: true,
    title: "Border Time",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_COLOR.light },
    { media: "(prefers-color-scheme: dark)", color: THEME_COLOR.dark },
  ],
};

const bootScript = `try{var l=document.cookie.match(/(?:^|; )${LOCALE_COOKIE.replaceAll(".", "\\.")}=(en|es)/);if(l)document.documentElement.lang=l[1];var t=document.cookie.match(/(?:^|; )${THEME_COOKIE.replaceAll(".", "\\.")}=(light|dark)/);if(t){document.documentElement.dataset.theme=t[1];var c=t[1]==="dark"?"${THEME_COLOR.dark}":"${THEME_COLOR.light}";document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){m.setAttribute("content",c)})}}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
        <Suspense fallback={<ShellSkeleton wordless />}>
          <Localized>{children}</Localized>
        </Suspense>
      </body>
    </html>
  );
}

async function Localized({ children }: { children: ReactNode }) {
  const [locale, theme] = await Promise.all([resolveLocale(), resolveTheme()]);
  return (
    <Providers locale={locale} theme={theme}>
      {children}
    </Providers>
  );
}
