import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { STORE } from "@/lib/delivery-config";
import { env } from "@/lib/env";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

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
    "Groceries, snacks and household essentials delivered to your door. Cash on delivery, free delivery over Rs. 1,000.",
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
    <html lang="en" dir="ltr" className={`${geist.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
