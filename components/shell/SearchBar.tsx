"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Storefront search box. Submits to /search?q=… — a native GET form (works with
 * JS off, and is literally `action="/search"`), upgraded to a client-side push
 * when JS is on. On the /search page it mirrors the active query and auto-focuses
 * when the query is empty. Rendered inline in the header on >=sm and as its own
 * row on mobile.
 */
export function SearchBar({ className }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");

  const onSearchPage = pathname === "/search";

  // On the results page, seed the box from the URL's ?q= and, if it's empty,
  // drop the cursor straight in. Keyed on pathname (client-only) so it never
  // clobbers what the shopper is typing on other pages, and avoids
  // useSearchParams() forcing a Suspense boundary on the shared header.
  useEffect(() => {
    if (!onSearchPage || typeof window === "undefined") return;
    const term = new URLSearchParams(window.location.search).get("q") ?? "";
    setQ(term);
    if (term === "") inputRef.current?.focus();
  }, [onSearchPage, pathname]);

  const submit = (e: React.FormEvent) => {
    const term = q.trim();
    if (!term) {
      // Don't navigate to a blank search; keep the shopper in the box.
      e.preventDefault();
      inputRef.current?.focus();
      return;
    }
    e.preventDefault();
    router.push(`/search?q=${encodeURIComponent(term)}`);
  };

  return (
    <form
      role="search"
      action="/search"
      method="get"
      onSubmit={submit}
      className={cn("relative flex-1", className)}
    >
      <Search
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <input
        ref={inputRef}
        name="q"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search tyres, sizes, vehicles…"
        aria-label="Search products"
        enterKeyHint="search"
        autoComplete="off"
        className="h-11 w-full rounded-xl border border-input bg-muted/60 pl-10 pr-10 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-ring/40"
      />
      {q && (
        <button
          type="button"
          onClick={() => {
            setQ("");
            inputRef.current?.focus();
          }}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      )}
    </form>
  );
}
