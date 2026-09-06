"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Package, MapPin, Heart, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { SignOutButton } from "@/components/account/sign-out-button";

type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
  /** Match exactly (Overview) vs by prefix (everything else). */
  exact?: boolean;
};

const ITEMS: NavItem[] = [
  { href: "/account", label: "Overview", icon: Home, exact: true },
  { href: "/account/orders", label: "Orders", icon: Package },
  { href: "/account/addresses", label: "Addresses", icon: MapPin },
  { href: "/account/wishlist", label: "Wishlist", icon: Heart },
  { href: "/account/settings", label: "Settings", icon: Settings },
];

/**
 * Account section nav. `sidebar` = vertical list (desktop aside); `tabs` =
 * horizontal scrollable pills (mobile top). Sign out is a NextAuth signOut()
 * button, not a link.
 */
export function AccountNav({
  variant = "sidebar",
  className,
}: {
  variant?: "sidebar" | "tabs";
  className?: string;
}) {
  const pathname = usePathname() || "/account";
  const active = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  if (variant === "tabs") {
    return (
      <nav
        aria-label="Account"
        className={cn("flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", className)}
      >
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const on = active(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={on ? "page" : undefined}
              className={cn(
                "tap-target inline-flex shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors",
                on
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {item.label}
            </Link>
          );
        })}
        <SignOutButton className="tap-target inline-flex shrink-0 items-center gap-2 rounded-full border border-input px-4 text-sm font-semibold text-muted-foreground transition-colors hover:border-red-200 hover:text-red-600">
          <LogOut className="size-4" aria-hidden />
          Sign out
        </SignOutButton>
      </nav>
    );
  }

  return (
    <nav aria-label="Account" className={cn("flex flex-col gap-1", className)}>
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const on = active(item);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={on ? "page" : undefined}
            className={cn(
              "tap-target flex items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors",
              on
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-5 shrink-0" aria-hidden />
            {item.label}
          </Link>
        );
      })}
      <SignOutButton className="tap-target mt-1 flex items-center gap-3 rounded-xl border-t border-transparent px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-red-600">
        <LogOut className="size-5 shrink-0" aria-hidden />
        Sign out
      </SignOutButton>
    </nav>
  );
}
