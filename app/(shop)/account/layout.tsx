import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { AccountNav } from "@/components/account/AccountNav";

/**
 * Account sub-shell (inside the shop shell): a desktop sidebar with the user's
 * name/email + section nav, and horizontal scrollable tabs on mobile. Guarded —
 * `middleware.ts` already redirects /account/* to /signin?callbackUrl=… for
 * signed-out visitors; this re-checks (and supplies the user for the sidebar),
 * redirecting as a fallback.
 */
export default async function AccountLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  if (!user) redirect("/signin?callbackUrl=/account");

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="lg:flex lg:gap-8">
        {/* Desktop sidebar */}
        <aside className="hidden shrink-0 lg:block lg:w-60">
          <div className="sticky top-[100px]">
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="truncate font-extrabold text-foreground">{user.name}</p>
              <p className="truncate text-sm text-muted-foreground">{user.email}</p>
            </div>
            <AccountNav className="mt-4" />
          </div>
        </aside>

        {/* Mobile tabs */}
        <AccountNav variant="tabs" className="-mx-4 mb-5 px-4 lg:hidden" />

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
