import Link from "next/link";
import { STORE } from "@/lib/delivery-config";
import { BrandMark } from "@/components/brand-mark";

/**
 * Minimal auth shell: the store logo up top (links home), a centered card slot,
 * and a back-to-store link below. No shop header, bottom nav, or cart context —
 * sign-in / register / password reset stand on their own. Pages render their
 * own `w-full max-w-sm` card inside the centered main.
 */
export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col bg-muted/30">
      <header className="flex justify-center px-4 pb-2 pt-8 sm:pt-12">
        <Link
          href="/"
          className="flex items-center gap-2"
          aria-label={`${STORE.name} home`}
        >
          <BrandMark size={34} />
          <span className="text-lg font-extrabold tracking-tight text-foreground">
            {STORE.name}
          </span>
        </Link>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-6 sm:items-center sm:py-10">
        {children}
      </main>

      <footer className="px-4 pb-8 text-center">
        <Link
          href="/"
          className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Back to store
        </Link>
      </footer>
    </div>
  );
}
