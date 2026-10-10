import { Providers } from "@/components/providers";
import { ShellSkeleton } from "@/components/wallet/shell-skeleton";
import { COPY, LOCALE_COOKIE } from "@/lib/i18n";
import { resolveLocale } from "@/lib/locale.server";
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
    { media: "(prefers-color-scheme: light)", color: "#f1f2f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0b0f" },
  ],
};

const localeScript = `try{var m=document.cookie.match(/(?:^|; )${LOCALE_COOKIE}=(en|es)/);if(m)document.documentElement.lang=m[1]}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <script dangerouslySetInnerHTML={{ __html: localeScript }} />
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
