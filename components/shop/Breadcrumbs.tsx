import Link from "next/link";
import { headers } from "next/headers";

export type Crumb = { label: string; href?: string };

/** Visual breadcrumb + BreadcrumbList JSON-LD (absolute URLs for crawlers). */
export async function Breadcrumbs({ items }: { items: Crumb[] }) {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  const origin = `${proto}://${host}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      ...(c.href ? { item: `${origin}${c.href}` } : {}),
    })),
  };

  return (
    <>
      <nav aria-label="Breadcrumb" className="text-xs font-semibold text-muted-foreground">
        {items.map((c, i) => (
          <span key={i}>
            {i > 0 && <span className="mx-1.5 text-border">/</span>}
            {c.href ? (
              <Link href={c.href} className="hover:text-foreground">
                {c.label}
              </Link>
            ) : (
              <span className="text-foreground">{c.label}</span>
            )}
          </span>
        ))}
      </nav>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}
