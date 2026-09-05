"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { STORE } from "@/lib/delivery-config";
import { AdminNav, type AdminNavItem } from "./admin-nav";

/** Mobile-only hamburger that opens the admin sidebar in a slide-over drawer. */
export function AdminMobileNav({ role, items }: { role: string; items: AdminNavItem[] }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  // Portal target is only available on the client.
  useEffect(() => setMounted(true), []);

  // Close on navigation.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // The drawer is portalled to <body> so it escapes the admin header's
  // `backdrop-blur` — a backdrop-filter ancestor becomes the containing block
  // for fixed children, which would otherwise clip the drawer to the header.
  const drawer = (
    <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal="true">
      <button
        aria-label="Close menu"
        onClick={() => setOpen(false)}
        className="absolute inset-0 bg-black/50 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200"
      />
      <div className="absolute inset-y-0 left-0 flex h-full w-[80%] max-w-xs flex-col bg-ink text-white/80 shadow-float motion-safe:animate-in motion-safe:slide-in-from-left motion-safe:duration-300">
        <div className="flex items-center gap-2.5 px-5 py-4">
          <BrandMark size={34} priority onDark />
          <div>
            <div className="font-display text-lg font-extrabold leading-none text-white">
              {STORE.name}
            </div>
            <div className="mt-1 text-[10px] uppercase tracking-wider text-white/50">
              Admin
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="press ml-auto grid size-9 place-items-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <AdminNav items={items} />
        </div>
        <div className="border-t border-white/10 p-4 text-[11px] font-semibold uppercase tracking-wide text-primary">
          {role}
        </div>
      </div>
    </div>
  );

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="press grid size-9 place-items-center rounded-lg border hover:bg-muted"
      >
        <Menu className="size-5" />
      </button>

      {open && mounted && createPortal(drawer, document.body)}
    </div>
  );
}
