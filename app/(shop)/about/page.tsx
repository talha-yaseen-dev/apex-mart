import type { Metadata } from "next";
import { headers } from "next/headers";
import { STORE, STORE_GEO, SAME_DAY_CUTOFF } from "@/lib/delivery-config";
import { Breadcrumbs } from "@/components/shop/Breadcrumbs";

export const metadata: Metadata = {
  title: "About",
  description:
    "Apex Mart is your neighbourhood mini-mart — groceries, snacks, household and personal-care essentials delivered the same day, with cash on delivery.",
  alternates: { canonical: "/about" },
};

/**
 * Hero background. TODO(owner): replace this stock Unsplash photo with a real
 * photo of the shop / storefront. Decorative only (the H1 sits on top), so the
 * alt stays empty.
 */
const HERO_IMAGE =
  "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=1600&h=700&fit=crop&auto=format";

/** What we stock — factual category summaries (no invented ranges or counts). */
const DELIVER = [
  { icon: "🌾", label: "Fresh Groceries", note: "Rice, atta, cooking oil, daal, sugar and tea." },
  { icon: "🧽", label: "Household Essentials", note: "Detergents, cleaners, dishwash and home care." },
  { icon: "🧴", label: "Personal Care", note: "Shampoo, soap, toothpaste and grooming." },
  { icon: "👶", label: "Baby & Kids", note: "Diapers, wipes, baby food and kids' care." },
  { icon: "🥤", label: "Snacks & Beverages", note: "Chips, biscuits, chocolate, drinks and juices." },
  { icon: "⚡", label: "Same-Day Delivery", note: `Order before ${SAME_DAY_CUTOFF} for same-day to selected zones.` },
];

/** Our promises — one line each, tied to real store facts (COD, PKR, returns). */
const COMMITMENTS = [
  { icon: "✅", title: "Quality guarantee", body: "Not right or damaged? Send it back at the door." },
  { icon: "🏷️", title: "Honest prices", body: "Clear PKR pricing — no surprises when the rider arrives." },
  { icon: "🛵", title: "Fast delivery", body: "Same-day delivery to selected residential zones." },
];

/** Small amber flag marking placeholder content the owner must replace. */
function Todo({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-700">
      <span aria-hidden>⚠</span> TODO {children}
    </span>
  );
}

export default async function AboutPage() {
  // Absolute origin for the LocalBusiness structured data (mirrors Breadcrumbs).
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  const origin = `${proto}://${host}`;

  const waHref = `https://wa.me/${STORE.whatsapp}`;
  const telHref = `tel:${STORE.phone.replace(/[^\d+]/g, "")}`;

  // LocalBusiness (GroceryStore) JSON-LD. Only emits fields we actually hold;
  // geo is omitted until STORE_GEO is set (no guessed coordinates).
  const businessLd = {
    "@context": "https://schema.org",
    "@type": "GroceryStore",
    "@id": `${origin}/#store`,
    name: STORE.name,
    description: metadata.description,
    url: `${origin}/`,
    telephone: STORE.phone,
    priceRange: "PKR",
    address: {
      "@type": "PostalAddress",
      streetAddress: STORE.address,
      // Only emit the parts that are actually filled in (no empty fields).
      ...(STORE.city ? { addressLocality: STORE.city } : {}),
      ...(STORE.region ? { addressRegion: STORE.region } : {}),
      ...(STORE.postalCode ? { postalCode: STORE.postalCode } : {}),
      addressCountry: STORE.country,
    },
    openingHours: STORE.openingHours,
    ...(STORE_GEO
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: STORE_GEO.latitude,
            longitude: STORE_GEO.longitude,
          },
        }
      : {}),
  };

  return (
    <>
      {/* Breadcrumb (also emits BreadcrumbList JSON-LD) */}
      <div className="mx-auto max-w-5xl px-4 pt-4">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "About" }]} />
      </div>

      {/* Hero — full-bleed */}
      <section className="relative isolate mt-4 flex min-h-[300px] items-end overflow-hidden bg-slate-900 sm:min-h-[380px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={HERO_IMAGE}
          alt=""
          aria-hidden
          className="absolute inset-0 size-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/70 to-slate-900/20" />
        <div className="relative mx-auto w-full max-w-5xl px-4 pb-8 pt-16">
          <div className="mb-3">
            <Todo>replace hero photo</Todo>
          </div>
          <h1 className="text-balance text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
            About {STORE.name}
          </h1>
          <p className="mt-3 max-w-xl text-pretty text-sm leading-relaxed text-slate-200 sm:text-base">
            Your neighbourhood mini-mart — groceries, snacks and household essentials,
            delivered to your door the same day.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 pb-6">
        {/* Our story */}
        <section className="py-12">
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Our story</h2>
          <div className="mt-4 max-w-2xl space-y-4 text-[15px] leading-relaxed text-muted-foreground">
            <p>
              {STORE.name} is a neighbourhood mini-mart built around one simple idea: the
              everyday things your home runs on should reach your door the same day — without
              a trip to the market.
            </p>
            <p>
              We stock groceries, snacks, household and personal-care essentials at everyday
              prices, and we keep it simple. Browse, order, and pay cash when the rider hands
              over your bag.
            </p>
            <p>
              No app to install, no card required. Just your local shop, a little closer.
            </p>
          </div>
          <p className="mt-4 max-w-2xl text-sm">
            <Todo>rewrite our story</Todo>{" "}
            <span className="text-muted-foreground">
              Replace the placeholder copy above with your real story — when the shop opened,
              who runs it, what makes it yours. Don&apos;t invent dates, names or figures.
            </span>
          </p>
        </section>

        {/* What we deliver */}
        <section className="border-t border-border py-12">
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">What we deliver</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Everything for the home, across six aisles.
          </p>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {DELIVER.map((d) => (
              <div
                key={d.label}
                className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5"
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted text-2xl">
                  {d.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-base font-extrabold text-foreground">{d.label}</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{d.note}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Our commitments */}
        <section className="border-t border-border py-12">
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Our commitments</h2>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {COMMITMENTS.map((c) => (
              <div key={c.title} className="rounded-2xl border border-border bg-card p-6">
                <span className="text-3xl">{c.icon}</span>
                <p className="mt-3 text-base font-extrabold text-foreground">{c.title}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{c.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Store information */}
        <section className="border-t border-border py-12">
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
            Store information
          </h2>

          <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex items-start gap-2 border-b border-amber-200 bg-amber-50 px-5 py-3 text-[13px] text-amber-800">
              <span aria-hidden className="mt-0.5">⚠</span>
              <p>
                <span className="font-bold">TODO (owner):</span> the details below are
                placeholders. Confirm or replace each one — they also power the Google
                business listing (structured data) for this page.
              </p>
            </div>

            <dl className="divide-y divide-border">
              <InfoRow icon="🏪" label="Store">
                {STORE.name}
              </InfoRow>
              <InfoRow icon="📍" label="Address">
                {STORE.address}
              </InfoRow>
              <InfoRow icon="🏙️" label="City">
                {STORE.city || <Todo>add city</Todo>}
              </InfoRow>
              <InfoRow icon="🗺️" label="Region">
                {STORE.region || <Todo>add region</Todo>}
              </InfoRow>
              <InfoRow icon="🏷️" label="Postal code">
                {STORE.postalCode || <Todo>add postal code</Todo>}
              </InfoRow>
              <InfoRow icon="🕒" label="Hours">
                {STORE.hours}
              </InfoRow>
              <InfoRow icon="📞" label="Phone">
                <a href={telHref} className="font-semibold text-primary hover:underline">
                  {STORE.phone}
                </a>
              </InfoRow>
              <InfoRow icon="💬" label="WhatsApp">
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-primary hover:underline"
                >
                  {STORE.whatsapp}
                </a>
              </InfoRow>
            </dl>
          </div>
        </section>

        {/* Contact CTA */}
        <section className="border-t border-border py-12">
          <div className="rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 text-center sm:p-10">
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
              Questions? We&apos;re a message away.
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Ask about an order, a product, or delivery to your area — we&apos;ll get back to
              you.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="tap-target inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-extrabold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                💬 WhatsApp us
              </a>
            </div>
          </div>
        </section>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(businessLd) }}
      />
    </>
  );
}

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 px-5 py-3.5">
      <span aria-hidden className="text-lg">{icon}</span>
      <dt className="w-28 shrink-0 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="min-w-0 text-sm font-medium text-foreground">{children}</dd>
    </div>
  );
}
