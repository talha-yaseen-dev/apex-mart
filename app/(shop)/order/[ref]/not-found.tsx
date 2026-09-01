import Link from "next/link";

/** Shown when an order ref doesn't resolve, or access isn't proven. */
export default function OrderNotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <div className="mb-4 text-5xl">🔍</div>
      <h1 className="text-xl font-extrabold text-foreground">Order not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        We couldn&apos;t find that order, or it belongs to a different phone number. Track a
        guest order with your reference and phone.
      </p>
      <div className="mt-6 flex gap-3">
        <Link
          href="/track"
          className="tap-target inline-flex items-center rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground"
        >
          Track an order
        </Link>
        <Link
          href="/"
          className="tap-target inline-flex items-center rounded-xl border border-input px-5 text-sm font-bold text-foreground"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
