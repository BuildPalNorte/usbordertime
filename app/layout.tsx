import { Providers } from "@/components/providers";
import { ShellSkeleton } from "@/components/wallet/shell-skeleton";
import { entityJsonLd, jsonLd } from "@/lib/guide-schema";
import { COPY, LOCALE_COOKIE } from "@/lib/i18n";
import { resolveLocale } from "@/lib/locale.server";
import { siteOrigin } from "@/lib/site";
import { THEME_COLOR } from "@/lib/theme";
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

// No headers() here: reading the request would make this dynamic, and Next.js streams
// dynamic metadata into <body> instead of <head>. Bots that don't run JavaScript — and
// Lighthouse's SEO audit, which only looks in <head> — would then see no description.
export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  title: "Border Time",
  description: COPY.en.metaDescription,
  applicationName: "Border Time",
  appleWebApp: {
    capable: true,
    title: "Border Time",
    statusBarStyle: "default",
  },
  openGraph: {
    title: "Border Time",
    description: COPY.en.metaDescription,
    siteName: "Border Time",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Border Time",
    description: COPY.en.metaDescription,
  },
  alternates: {
    types: {
      "text/plain": "/llms.txt",
    },
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

const bootScript = `try{var l=document.cookie.match(/(?:^|; )${LOCALE_COOKIE.replaceAll(".", "\\.")}=(en|es)/);if(l)document.documentElement.lang=l[1];var dark=window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.dataset.theme=dark?"dark":"light";var c=dark?"${THEME_COLOR.dark}":"${THEME_COLOR.light}";document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){m.setAttribute("content",c)});var mem=navigator.deviceMemory;var cores=navigator.hardwareConcurrency;var save=navigator.connection&&navigator.connection.saveData;if((mem&&mem<=4)||(cores&&cores<=4)||save)document.documentElement.dataset.perf="low"}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(entityJsonLd()) }} />
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
        <Suspense fallback={<ShellSkeleton wordless />}>
          <Localized>{children}</Localized>
        </Suspense>
      </body>
    </html>
  );
}

async function Localized({ children }: { children: ReactNode }) {
  const locale = await resolveLocale();
  return <Providers locale={locale}>{children}</Providers>;
}
