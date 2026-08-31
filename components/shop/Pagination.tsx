import Link from "next/link";

type PaginationProps = {
  basePath: string;
  page: number;
  totalPages: number;
  searchParams: Record<string, string | string[] | undefined>;
};

function hrefFor(
  basePath: string,
  sp: PaginationProps["searchParams"],
  page: number,
): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (k === "page") continue;
    const one = Array.isArray(v) ? v[0] : v;
    if (one) qs.set(k, one);
  }
  if (page > 1) qs.set("page", String(page));
  const s = qs.toString();
  return s ? `${basePath}?${s}` : basePath;
}

/** SSR pagination (SEO-friendly). Emits rel prev/next; hidden for single pages. */
export function Pagination({ basePath, page, totalPages, searchParams }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: number[] = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) pages.push(p);
  }
  const withGaps: (number | "…")[] = [];
  pages.forEach((p, i) => {
    if (i > 0 && p - pages[i - 1] > 1) withGaps.push("…");
    withGaps.push(p);
  });

  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-1.5">
      {/* Hoisted to <head> by Next for crawler pagination hints */}
      {page > 1 && <link rel="prev" href={hrefFor(basePath, searchParams, page - 1)} />}
      {page < totalPages && <link rel="next" href={hrefFor(basePath, searchParams, page + 1)} />}

      <PagerLink
        href={hrefFor(basePath, searchParams, page - 1)}
        disabled={page <= 1}
        label="Previous page"
      >
        ‹
      </PagerLink>

      {withGaps.map((p, i) =>
        p === "…" ? (
          <span key={`gap-${i}`} className="px-1 text-sm text-muted-foreground">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={hrefFor(basePath, searchParams, p)}
            aria-current={p === page ? "page" : undefined}
            className={
              "tap-target inline-flex min-w-11 items-center justify-center rounded-lg px-2 text-sm font-bold " +
              (p === page
                ? "bg-primary text-primary-foreground"
                : "border border-input bg-background text-foreground hover:bg-muted")
            }
          >
            {p}
          </Link>
        ),
      )}

      <PagerLink
        href={hrefFor(basePath, searchParams, page + 1)}
        disabled={page >= totalPages}
        label="Next page"
      >
        ›
      </PagerLink>
    </nav>
  );
}

function PagerLink({
  href,
  disabled,
  label,
  children,
}: {
  href: string;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span
        aria-disabled
        className="tap-target inline-flex min-w-11 items-center justify-center rounded-lg border border-input bg-muted/50 px-2 text-sm font-bold text-muted-foreground/50"
      >
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      aria-label={label}
      className="tap-target inline-flex min-w-11 items-center justify-center rounded-lg border border-input bg-background px-2 text-sm font-bold text-foreground hover:bg-muted"
    >
      {children}
    </Link>
  );
}
