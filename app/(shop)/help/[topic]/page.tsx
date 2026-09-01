import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ThumbsDown, ThumbsUp } from "lucide-react";
import { helpTopic, type Block } from "@/content/help";
import { Breadcrumbs } from "@/components/shop/Breadcrumbs";

type PageProps = { params: Promise<{ topic: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { topic } = await params;
  const t = helpTopic(topic);
  if (!t) return { title: "Help" };
  return {
    title: t.metaTitle,
    description: t.metaDescription,
    alternates: { canonical: `/help/${t.slug}` },
  };
}

export default async function HelpTopicPage({ params }: PageProps) {
  const { topic } = await params;
  const t = helpTopic(topic);
  if (!t) notFound();

  const toc = t.sections
    ? t.sections.map((s) => ({ id: s.id, label: s.heading }))
    : (t.faqGroups ?? []).map((g) => ({ id: g.id, label: g.group }));

  // FAQ JSON-LD only for entries that actually have answers (skip TODOs).
  const answered = (t.faqGroups ?? []).flatMap((g) =>
    g.items.filter((i) => i.a && i.a.trim().length > 0),
  );
  const faqJsonLd =
    answered.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: answered.map((i) => ({
            "@type": "Question",
            name: i.q,
            acceptedAnswer: { "@type": "Answer", text: i.a },
          })),
        }
      : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-4">
      {/* Sticky back-to-help (mobile) */}
      <Link
        href="/help"
        className="sticky top-[132px] z-20 -mx-4 mb-2 flex items-center gap-1 bg-background/95 px-4 py-2 text-sm font-bold text-primary backdrop-blur sm:top-[80px] lg:hidden"
      >
        <ChevronLeft className="size-4" /> Back to Help
      </Link>

      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Help", href: "/help" },
          { label: t.title },
        ]}
      />

      <div className="mt-4 flex gap-8">
        {/* Desktop TOC */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-[100px]">
            <p className="mb-3 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
              On this page
            </p>
            <nav className="flex flex-col gap-2 border-l border-border pl-3 text-sm">
              {toc.map((e) => (
                <a key={e.id} href={`#${e.id}`} className="text-muted-foreground hover:text-foreground">
                  {e.label}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        <article className="min-w-0 max-w-2xl flex-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">{t.title}</h1>

          {/* Mobile collapsible TOC */}
          <details className="mt-4 rounded-xl border border-border bg-muted/40 p-4 lg:hidden">
            <summary className="cursor-pointer text-sm font-extrabold text-foreground">
              On this page
            </summary>
            <nav className="mt-3 flex flex-col gap-2 text-sm">
              {toc.map((e) => (
                <a key={e.id} href={`#${e.id}`} className="text-primary">
                  {e.label}
                </a>
              ))}
            </nav>
          </details>

          {/* Sections (delivery / pickup / returns) */}
          {t.sections?.map((s) => (
            <section key={s.id} id={s.id} className="mt-8 scroll-mt-28">
              <h2 className="text-xl font-extrabold text-foreground">{s.heading}</h2>
              <div className="mt-3 space-y-3">
                {s.blocks.map((b, i) => (
                  <BlockView key={i} block={b} />
                ))}
              </div>
            </section>
          ))}

          {/* FAQ groups */}
          {t.faqGroups?.map((g) => (
            <section key={g.id} id={g.id} className="mt-8 scroll-mt-28">
              <h2 className="text-xl font-extrabold text-foreground">{g.group}</h2>
              <div className="mt-3 space-y-4">
                {g.items.map((item, i) => (
                  <div key={i}>
                    <p className="text-lg font-bold text-foreground">{item.q}</p>
                    {item.a ? (
                      <p className="mt-1 text-lg leading-relaxed text-muted-foreground">{item.a}</p>
                    ) : (
                      <TodoBox note="Answer pending — add the official response." />
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}

          {/* Was this helpful? (visual only) */}
          <div className="mt-10 flex items-center gap-3 border-t border-border pt-6">
            <span className="text-sm font-semibold text-muted-foreground">Was this helpful?</span>
            <button
              type="button"
              aria-label="Yes, this was helpful"
              className="tap-target inline-flex items-center justify-center rounded-lg border border-input px-3 text-muted-foreground hover:text-foreground"
            >
              <ThumbsUp className="size-4" />
            </button>
            <button
              type="button"
              aria-label="No, this was not helpful"
              className="tap-target inline-flex items-center justify-center rounded-lg border border-input px-3 text-muted-foreground hover:text-foreground"
            >
              <ThumbsDown className="size-4" />
            </button>
          </div>

          {/* Contact CTA */}
          <div className="mt-6 rounded-2xl border border-border bg-muted/40 p-5 text-center">
            <p className="text-sm font-semibold text-foreground">Still need help?</p>
            <Link
              href="/about"
              className="tap-target mt-3 inline-flex items-center rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary/90"
            >
              Contact us
            </Link>
          </div>
        </article>
      </div>

      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
    </div>
  );
}

function BlockView({ block }: { block: Block }) {
  if ("p" in block) {
    return <p className="text-lg leading-relaxed text-muted-foreground">{block.p}</p>;
  }
  if ("list" in block) {
    return (
      <ul className="ml-5 list-disc space-y-1 text-lg leading-relaxed text-muted-foreground">
        {block.list.map((li, i) => (
          <li key={i}>{li}</li>
        ))}
      </ul>
    );
  }
  return <TodoBox note={block.todo} />;
}

function TodoBox({ note }: { note: string }) {
  return (
    <p className="rounded-xl border border-deal/50 bg-deal/10 p-3 text-sm font-semibold text-deal-foreground">
      🚧 TODO — {note}
    </p>
  );
}
