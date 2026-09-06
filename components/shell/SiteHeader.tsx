import Link from "next/link";
import { STORE } from "@/lib/delivery-config";
import { getCurrentUser } from "@/lib/session";
import { User } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { LocationBar } from "./LocationBar";
import { SearchBar } from "./SearchBar";
import { CartButton } from "./CartButton";

/**
 * Sticky storefront header: a dark utility bar (delivery location + promises)
 * over the main bar (logo, search, cart). Mobile-first — the logo and cart sit
 * on the top row and search drops to its own full-width row below <sm.
 *
 * Employees browsing the storefront get an "Admin" shortcut back to the
 * dashboard — otherwise there's no way back into the admin surface from here.
 * getCurrentUser() is cache()-wrapped, so this shares the read every shop page
 * already makes (e.g. wishlist state on the home page) at no extra cost.
 */
export async function SiteHeader() {
  const user = await getCurrentUser();
  const isStaff = Boolean(user?.isEmployee);
  return (
    <header className="sticky top-0 z-40">
      {/* Utility bar */}
      <div className="bg-slate-900 text-slate-300">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-1.5 text-xs">
          <LocationBar />
          <div className="hidden items-center gap-3 sm:flex">
            <span>Free delivery over Rs. 1,000</span>
            <span className="text-slate-600">·</span>
            <span>Cash on Delivery</span>
            <span className="text-slate-600">·</span>
            <span>Dispatch before 6pm</span>
          </div>
          <span className="font-medium sm:hidden">Free over Rs. 1,000</span>
        </div>
      </div>

      {/* Main bar — more transparent on mobile, more solid on desktop. */}
      <div className="border-b border-border bg-background/70 backdrop-blur md:bg-background/90">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5">
          <Link href="/" className="flex shrink-0 items-center gap-2" aria-label={`${STORE.name} home`}>
            <BrandMark size={38} priority />
            <span className="leading-tight">
              {/* Wordmark shows on mobile too, beside the logo. */}
              <span className="block text-base font-extrabold tracking-tight text-foreground">
                {STORE.name}
              </span>
              <span className="hidden text-[11px] font-medium text-muted-foreground xs:block">
                {STORE.tagline}
              </span>
            </span>
          </Link>

          <SearchBar className="hidden sm:block" />

          <div className="ml-auto flex items-center gap-2">
            {isStaff && (
              <Link
                href="/admin/inventory"
                className="tap-target inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary-tint px-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground sm:px-3"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <rect x="3" y="3" width="7" height="9" rx="1" />
                  <rect x="14" y="3" width="7" height="5" rx="1" />
                  <rect x="14" y="12" width="7" height="9" rx="1" />
                  <rect x="3" y="16" width="7" height="5" rx="1" />
                </svg>
                <span className="hidden xs:inline">Admin</span>
              </Link>
            )}
            {/* Mobile: account icon in the header (desktop keeps the text link). */}
            <Link
              href="/account"
              aria-label="Account"
              className="tap-target inline-flex items-center justify-center rounded-xl px-2 text-foreground transition-colors hover:bg-muted md:hidden"
            >
              <User className="size-[21px]" aria-hidden />
            </Link>
            <Link
              href="/account"
              className="tap-target hidden items-center rounded-xl px-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted md:inline-flex"
            >
              Account
            </Link>
            <CartButton />
          </div>
        </div>

        {/* Mobile search row */}
        <div className="px-4 pb-2.5 sm:hidden">
          <SearchBar />
        </div>
      </div>
    </header>
  );
}
