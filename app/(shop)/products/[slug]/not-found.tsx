import Link from "next/link";

/** Shown when a product slug doesn't resolve. */
export default function ProductNotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <div className="mb-4 text-5xl">🛒</div>
      <h1 className="text-xl font-extrabold text-foreground">Product not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This product may be out of our catalogue or the link is broken.
      </p>
      <div className="mt-6 flex gap-3">
        <Link
          href="/c"
          className="tap-target inline-flex items-center rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground"
        >
          Browse categories
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
