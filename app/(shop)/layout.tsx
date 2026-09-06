import Link from "next/link";
import { SiteHeader } from "@/components/shell/SiteHeader";
import { BottomNav } from "@/components/shell/BottomNav";
import { Toaster } from "@/components/ui/sonner";
import { CartProvider } from "@/components/cart/CartProvider";
import { STORE } from "@/lib/delivery-config";
import { LEGAL_DOCS, LEGAL_SLUGS } from "@/content/legal";

/**
 * Storefront shell for every shopping route: the sticky header, the mobile
 * bottom nav, the cart context that pages (and their ProductCard add buttons)
 * depend on, and the site footer with the legal links. Auth pages sit in
 * app/(auth) and deliberately get none of this.
 */
export default function ShopLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <CartProvider>
      <div className="flex min-h-dvh flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <BottomNav />
      </div>
      <Toaster position="bottom-right" richColors />
    </CartProvider>
  );
}

function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border bg-muted/40">
      {/* Extra bottom padding clears the fixed mobile bottom nav (md:hidden). */}
      <div className="mx-auto max-w-7xl px-4 py-8 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-8">
        <nav aria-label="Legal" className="flex flex-wrap gap-x-6 gap-y-2">
          {LEGAL_SLUGS.map((slug) => (
            <Link
              key={slug}
              href={`/legal/${slug}`}
              className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              {LEGAL_DOCS[slug].title}
            </Link>
          ))}
        </nav>
        <p className="mt-4 text-xs text-muted-foreground">
          © {year} {STORE.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
