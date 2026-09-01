import { SiteHeader } from "@/components/shell/SiteHeader";
import { BottomNav } from "@/components/shell/BottomNav";
import { Toaster } from "@/components/ui/sonner";
import { CartProvider } from "@/components/cart/CartProvider";

/**
 * Storefront shell for every shopping route: the sticky header, the mobile
 * bottom nav, and the cart context that pages (and their ProductCard add
 * buttons) depend on. Auth pages sit in app/(auth) and deliberately get none
 * of this.
 */
export default function ShopLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <CartProvider>
      <div className="flex min-h-dvh flex-col">
        <SiteHeader />
        {/* pb clears the fixed mobile bottom nav */}
        <main className="flex-1 pb-24 md:pb-10">{children}</main>
        <BottomNav />
      </div>
      <Toaster position="top-center" richColors />
    </CartProvider>
  );
}
