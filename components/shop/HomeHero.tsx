import { HERO } from "@/lib/home-content";
import { STORE } from "@/lib/delivery-config";

/** Static merchandised hero (content from lib/home-content — no CMS yet). */
export function HomeHero() {
  return (
    <section className="flex flex-col gap-3 pt-5 lg:flex-row">
      <div className="relative flex min-h-[280px] flex-[2] items-center overflow-hidden rounded-3xl bg-slate-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={HERO.image}
          alt=""
          aria-hidden
          className="absolute inset-0 size-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-slate-900/70 to-slate-900/30" />
        <div className="relative max-w-xl px-6 py-9 sm:px-9">
          <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.16em] text-primary">
            {HERO.eyebrow}
          </p>
          <h1 className="mb-3 text-balance text-3xl font-extrabold leading-[1.06] tracking-tight text-white sm:text-4xl">
            {HERO.title}
          </h1>
          <p className="mb-6 max-w-md text-sm leading-relaxed text-slate-300">
            {HERO.subtitle}
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href={HERO.ctaHref}
              className="tap-target inline-flex items-center rounded-xl bg-primary px-6 text-sm font-extrabold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {HERO.ctaLabel} →
            </a>
            <a
              href={`https://wa.me/${STORE.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="tap-target inline-flex items-center rounded-xl border border-white/25 px-6 text-sm font-bold text-white transition-colors hover:bg-white/10"
            >
              📱 WhatsApp order
            </a>
          </div>
        </div>
      </div>

      <div className="flex flex-1 gap-3 lg:flex-col">
        {HERO.cards.map((c) => (
          <div
            key={c.title}
            className="flex flex-1 flex-col justify-center rounded-2xl border border-border bg-muted/50 p-5"
          >
            <span className="text-2xl">{c.icon}</span>
            <p className="mt-2 text-base font-extrabold text-foreground">{c.title}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{c.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
