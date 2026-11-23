import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { STORE } from "@/lib/delivery-config";
import {
  getLegalDoc,
  isTodoBody,
  LEGAL_SLUGS,
  type LegalDoc,
} from "@/content/legal";
import { Breadcrumbs } from "@/components/shop/Breadcrumbs";

type PageProps = {
  params: Promise<{ doc: string }>;
};

export function generateStaticParams() {
  return LEGAL_SLUGS.map((doc) => ({ doc }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { doc } = await params;
  const d = getLegalDoc(doc);
  if (!d) return { title: "Legal" };
  return {
    // Titles already carry the brand ("Apex Tyres Privacy Policy"), so use an
    // absolute title to avoid the root "%s · Apex Tyres" template doubling it.
    title: { absolute: d.title },
    description: d.description,
    alternates: { canonical: `/legal/${d.slug}` },
  };
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export default async function LegalPage({ params }: PageProps) {
  const { doc } = await params;
  const d = getLegalDoc(doc);
  if (!d) notFound();

  const toc = d.sections.map((s) => ({ id: slugify(s.heading), heading: s.heading }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Breadcrumbs
        items={[{ label: "Home", href: "/" }, { label: "Legal" }, { label: d.title }]}
      />

      <div className="mt-4 lg:flex lg:gap-10">
        {/* Desktop TOC */}
        <aside className="hidden shrink-0 lg:block lg:w-52">
          <nav aria-label="On this page" className="sticky top-[100px]">
            <p className="mb-3 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
              On this page
            </p>
            <ul className="border-l border-border">
              {toc.map((t) => (
                <li key={t.id}>
                  <a
                    href={`#${t.id}`}
                    className="-ml-px block border-l-2 border-transparent py-1 pl-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    {t.heading}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <article className="min-w-0 max-w-2xl">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            {d.title}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {d.updatedAt ? (
              <>Last updated: {d.updatedAt}</>
            ) : (
              <>
                Last updated: <TodoFlag>set date</TodoFlag>
              </>
            )}
          </p>

          {/* Mobile collapsible TOC */}
          <details className="mt-5 overflow-hidden rounded-xl border border-border bg-card lg:hidden">
            <summary className="tap-target flex cursor-pointer items-center px-4 text-sm font-bold text-foreground">
              On this page
            </summary>
            <nav aria-label="On this page" className="border-t border-border px-4 py-2">
              <ul className="space-y-0.5">
                {toc.map((t) => (
                  <li key={t.id}>
                    <a
                      href={`#${t.id}`}
                      className="tap-target flex items-center text-sm text-muted-foreground hover:text-primary"
                    >
                      {t.heading}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </details>

          <div className="mt-8 space-y-8">
            {d.sections.map((s) => (
              <section key={s.heading}>
                <h2
                  id={slugify(s.heading)}
                  className="scroll-mt-28 text-lg font-extrabold tracking-tight text-foreground"
                >
                  {s.heading}
                </h2>
                {isTodoBody(s.body) ? (
                  <TodoCallout>{s.body.replace(/^TODO:\s*/, "")}</TodoCallout>
                ) : (
                  <Prose body={s.body} />
                )}
              </section>
            ))}
          </div>

          <LegalFooter doc={d} />
        </article>
      </div>
    </div>
  );
}

/** Renders real (non-TODO) policy copy: paragraphs split on blank lines, with
 *  external links auto-nofollowed. Inert until the client supplies real text. */
function Prose({ body }: { body: string }) {
  const paras = body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  return (
    <div className="mt-3 space-y-3">
      {paras.map((p, i) => (
        <p key={i} className="text-[15px] leading-relaxed text-foreground/90">
          {linkify(p)}
        </p>
      ))}
    </div>
  );
}

function linkify(text: string) {
  return text.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="nofollow noopener noreferrer"
        className="text-primary underline underline-offset-2"
      >
        {part}
      </a>
    ) : (
      part
    ),
  );
}

function LegalFooter({ doc }: { doc: LegalDoc }) {
  const waHref = `https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(
    `Question about ${doc.title}`,
  )}`;
  return (
    <div className="mt-12 border-t border-border pt-6 text-sm text-muted-foreground">
      <p>
        Questions?{" "}
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-primary hover:underline"
        >
          Contact us on WhatsApp
        </a>
        .
      </p>
      <p className="mt-2">
        {doc.updatedAt ? (
          <>Last updated: {doc.updatedAt}</>
        ) : (
          <>
            Last updated: <TodoFlag>set date</TodoFlag>
          </>
        )}
      </p>
    </div>
  );
}

/** Inline amber flag (matches /about). */
function TodoFlag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-700">
      <span aria-hidden>⚠</span> TODO {children}
    </span>
  );
}

/** Amber callout block for a placeholder section body (matches /about). */
function TodoCallout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] leading-relaxed text-amber-800">
      <span aria-hidden className="mt-0.5">⚠</span>
      <p>
        <span className="font-bold">TODO:</span> {children}
      </p>
    </div>
  );
}
