import type { Metadata } from "next";
import Link from "next/link";
import { HELP_TOPICS } from "@/content/help";

export const metadata: Metadata = {
  title: "Help & support",
  description:
    "Get help with Apex Mart — delivery, store pickup, returns and refunds, and frequently asked questions.",
  alternates: { canonical: "/help" },
};

export default function HelpHubPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <nav aria-label="Breadcrumb" className="mb-3 text-xs font-semibold text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Home
        </Link>
        <span className="mx-1.5 text-border">/</span>
        <span className="text-foreground">Help</span>
      </nav>

      <h1 className="text-2xl font-extrabold tracking-tight text-foreground">How can we help?</h1>
      <p className="mt-1 text-base text-muted-foreground">
        Answers about delivery, pickup, returns, and more.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {HELP_TOPICS.map((t) => (
          <Link
            key={t.slug}
            href={`/help/${t.slug}`}
            className="group flex items-start gap-4 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted text-2xl transition-colors group-hover:bg-background">
              {t.icon}
            </span>
            <span className="min-w-0">
              <span className="block text-base font-extrabold text-foreground">{t.title}</span>
              <span className="mt-0.5 block text-sm text-muted-foreground">{t.preview}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
