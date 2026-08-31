"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, ShoppingCart, User } from "lucide-react";
import { cn } from "@/lib/utils";

type Item = {
  href: string;
  label: string;
  icon: typeof Home;
  isActive: (path: string) => boolean;
};

const ITEMS: Item[] = [
  { href: "/", label: "Home", icon: Home, isActive: (p) => p === "/" },
  { href: "/c", label: "Categories", icon: LayoutGrid, isActive: (p) => p.startsWith("/c") },
  { href: "/cart", label: "Cart", icon: ShoppingCart, isActive: (p) => p.startsWith("/cart") },
  { href: "/account", label: "Account", icon: User, isActive: (p) => p.startsWith("/account") || p.startsWith("/signin") },
];

/**
 * Mobile bottom navigation — the shop's primary nav on phones (the design's
 * desktop sidebar collapses to this). Hidden on >=md. Every target is a full
 * 44px tap area.
 */
export function BottomNav() {
  const pathname = usePathname() || "/";

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around">
        {ITEMS.map((item) => {
          const active = item.isActive(pathname);
          const Icon = item.icon;
          return (
            <li key={item.label} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "tap-target flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-semibold transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon aria-hidden className={cn("size-5", active && "stroke-[2.5px]")} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
