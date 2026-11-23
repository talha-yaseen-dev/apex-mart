import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { getOrderForUser } from "@/lib/account";
import { formatPKR, formatDate } from "@/lib/format";
import { ReturnForm } from "@/components/account/ReturnForm";

export const metadata: Metadata = {
  title: "Report a problem",
  robots: { index: false, follow: false },
};

type PageProps = { params: Promise<{ id: string }> };

export default async function ReturnPage({ params }: PageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return null; // layout already guards; satisfies types

  const order = await getOrderForUser(id, user.id);
  if (!order) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href={`/account/orders/${order.id}`}
        className="tap-target -ml-1 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden />
        Back to order
      </Link>

      <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-foreground">
        Report a problem
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Tell us what went wrong with this tyre order and we&apos;ll review your request.
      </p>

      {/* Order context — read-only, auto-attached to the request */}
      <section className="mt-5 rounded-2xl border border-border bg-muted/40 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span className="text-sm font-extrabold text-foreground">{order.number}</span>
          <span className="text-xs text-muted-foreground">
            Placed {formatDate(order.placedDate)}
          </span>
        </div>
        <ul className="mt-3 space-y-1.5">
          {order.items.map((it) => (
            <li key={it.id} className="flex items-baseline justify-between gap-3 text-xs">
              <span className="min-w-0 truncate text-muted-foreground">
                {it.qty}× {it.name}
                {it.variantLabel ? ` · ${it.variantLabel}` : ""}
              </span>
              <span className="shrink-0 font-semibold text-foreground">
                {formatPKR(it.lineTotalMinor)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t border-border pt-2 text-sm">
          <span className="font-bold text-foreground">Total</span>
          <span className="font-extrabold text-foreground">{formatPKR(order.totalMinor)}</span>
        </div>
      </section>

      <div className="mt-5">
        <ReturnForm orderId={order.id} orderNumber={order.number} />
      </div>
    </div>
  );
}
