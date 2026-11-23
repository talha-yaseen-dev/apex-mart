import type { Metadata } from "next";
import "./globals.css";
import { STORE } from "@/lib/delivery-config";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  // Env-driven base for absolute canonical + Open Graph URLs. Resolves to the
  // production domain (APP_URL, e.g. https://buildora.fun) on Vercel and to
  // localhost in dev — never hardcode the domain here.
  metadataBase: new URL(env.APP_URL),
  title: {
    default: `${STORE.name} — ${STORE.tagline}`,
    template: `%s · ${STORE.name}`,
  },
  description:
    "Shop bike, car and truck tyres by vehicle and size at Apex Tyres in Sargodha.",
};

/**
 * Root layout: html/body, font, and global styles only. The storefront chrome
 * (header, bottom nav, cart context) lives in app/(shop)/layout, so the
 * app/(auth) pages can render on their own minimal shell.
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body className="min-h-dvh bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
