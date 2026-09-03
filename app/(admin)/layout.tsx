import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { requireEmployee } from "@/lib/authz";
import {
  getEffectivePermissions,
  hasPermission,
  PERMISSIONS,
} from "@/lib/permissions";
import { AdminNav, type AdminNavItem } from "@/components/admin/admin-nav";
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";
import { SignOutButton } from "@/components/account/sign-out-button";

// Sidebar sections, each with the permission that reveals it. Items without a
// `need` are visible to every employee (dashboard, products, orders). The Team
// & Access page is hidden from the nav for Mart Shop's single-admin scope (see
// below) but still resolves directly at /admin/access.
const NAV: (AdminNavItem & { need?: string })[] = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories", need: PERMISSIONS.CATEGORIES_MANAGE },
  { href: "/admin/inventory", label: "Inventory", need: PERMISSIONS.INVENTORY_ADJUST },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/customers", label: "Customers", need: PERMISSIONS.CUSTOMERS_VIEW },
  { href: "/admin/coupons", label: "Coupons", need: PERMISSIONS.COUPONS_TOGGLE },
  { href: "/admin/reports", label: "Reports", need: PERMISSIONS.REPORTS_VIEW },
  // Hidden for single-admin scope (Mart Shop): the Team & Access page still
  // exists and resolves at /admin/access, it just isn't surfaced in the nav.
  // { href: "/admin/access", label: "Team & Access" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireEmployee();
  const perms = await getEffectivePermissions(user.id, user.role);
  const navItems: AdminNavItem[] = NAV.filter(
    (it) => !it.need || hasPermission(perms, it.need),
  ).map(({ href, label, exact }) => ({ href, label, exact }));

  return (
    <div data-accent="indigo" className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar — desktop only; mobile uses the drawer in the header. */}
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col bg-ink text-white/80 md:flex">
        <div className="flex items-center gap-2.5 px-5 py-4">
          <BrandMark size={34} priority onDark />
          <div>
            <div className="font-display text-lg font-extrabold leading-none text-white">
              Nova
            </div>
            <div className="mt-1 text-[10px] uppercase tracking-wider text-white/50">
              Admin
            </div>
          </div>
        </div>
        <AdminNav items={navItems} />
        <div className="mt-auto border-t border-white/10 p-4">
          <div className="mb-2 text-[12px] text-white/70">{user.name}</div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-primary">
            {user.role}
          </div>
        </div>
      </aside>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-card/95 px-4 py-3 backdrop-blur sm:px-6">
          <AdminMobileNav role={user.role} items={navItems} />
          <Link href="/" className="text-[13px] text-muted-foreground hover:text-foreground">
            ← Storefront
          </Link>
          <div className="ml-auto">
            <SignOutButton />
          </div>
        </header>
        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
