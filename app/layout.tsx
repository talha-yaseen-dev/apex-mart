import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/shell/SiteHeader";
import { BottomNav } from "@/components/shell/BottomNav";
import { Toaster } from "@/components/ui/sonner";
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" dir="ltr" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <div className="flex min-h-dvh flex-col">
          <SiteHeader />
          {/* pb clears the fixed mobile bottom nav */}
          <main className="flex-1 pb-24 md:pb-10">{children}</main>
          <BottomNav />
        </div>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
