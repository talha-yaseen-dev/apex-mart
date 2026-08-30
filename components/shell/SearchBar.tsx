"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Storefront search box. Submits to /search?q=… (query-driven results page).
 * Used inline in the header on >=sm and as its own row on mobile.
 */
export function SearchBar({ className }: { className?: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const term = q.trim();
        if (term) router.push(`/search?q=${encodeURIComponent(term)}`);
      }}
      className={cn("relative flex-1", className)}
    >
      <Search
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search rice, oil, shampoo, drinks…"
        aria-label="Search products"
        enterKeyHint="search"
        className="h-11 w-full rounded-xl border border-input bg-muted/60 pl-10 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-ring/40"
      />
    </form>
  );
}
