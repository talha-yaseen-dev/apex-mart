import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { STORE } from "@/lib/delivery-config";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${STORE.name} — ${STORE.tagline}`,
    template: `%s · ${STORE.name}`,
  },
  description:
    "Groceries, snacks and household essentials delivered to your door. Cash on delivery, free delivery over Rs. 1,500.",
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
    <html lang="en" dir="ltr" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-dvh bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
