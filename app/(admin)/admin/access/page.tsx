import { prisma } from "@/lib/db";
import { requireEmployee, myPermissions, can } from "@/lib/authz";
import { getActiveGrants, PERMISSIONS } from "@/lib/permissions";
import { AccessPanel } from "@/components/admin/access-panel";

export const dynamic = "force-dynamic";

export default async function AdminAccessPage() {
  const user = await requireEmployee();
  const [{ perms }, grants, requestable, canManage] = await Promise.all([
    myPermissions(),
    getActiveGrants(user.id),
    prisma.appRole.findMany({
      where: { selfRequestable: true },
      orderBy: { name: "asc" },
    }),
    can(PERMISSIONS.ACCESS_MANAGE),
  ]);

  // Admin-only "team" view: all assignable roles + the staff directory with the
  // per-assignment ids needed to revoke individual roles.
  const activeGrant = { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] };
  const [manageRoles, teamRaw] = canManage
    ? await Promise.all([
        prisma.appRole.findMany({
          orderBy: { name: "asc" },
          include: { permissions: { include: { permission: true } } },
        }),
        prisma.user.findMany({
          where: { isEmployee: true },
          orderBy: { name: "asc" },
          include: {
            roleAssignments: {
              where: activeGrant,
              include: {
                role: { include: { permissions: { include: { permission: true } } } },
              },
            },
          },
        }),
      ])
    : [[], []];

  const isSuper = (perms: { permission: { key: string } }[]) =>
    perms.some((p) => p.permission.key === PERMISSIONS.SUPER);

  const team = teamRaw.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    isSelf: u.id === user.id,
    // Effective admin = the legacy ADMIN enum OR a role granting SUPER.
    isAdmin: u.role === "ADMIN" || u.roleAssignments.some((a) => isSuper(a.role.permissions)),
    isPrimaryAdmin: u.isPrimaryAdmin,
    deactivated: Boolean(u.deactivatedAt),
    roles: u.roleAssignments.map((a) => ({
      assignmentId: a.id,
      name: a.role.name,
      grantsAdmin: isSuper(a.role.permissions),
      expiresAt: a.expiresAt ? a.expiresAt.toISOString() : null,
    })),
  }));
  const adminCount = team.filter((m) => m.isAdmin).length;
  const viewerIsPrimary = team.some((m) => m.isSelf && m.isPrimaryAdmin);

  return (
    <AccessPanel
      identity={{
        name: user.name ?? user.email ?? "",
        email: user.email ?? "",
        baselineRole: user.role,
        isEmployee: user.isEmployee,
      }}
      permissions={[...perms].sort()}
      grants={grants.map((g) => ({
        id: g.id,
        role: g.role,
        description: g.description,
        reason: g.reason,
        expiresAt: g.expiresAt ? g.expiresAt.toISOString() : null,
      }))}
      requestableRoles={requestable.map((r) => ({
        name: r.name,
        description: r.description,
      }))}
      canManage={canManage}
      manageableRoles={manageRoles.map((r) => ({
        name: r.name,
        description: r.description,
      }))}
      team={team}
      adminCount={adminCount}
      viewerIsPrimary={viewerIsPrimary}
    />
  );
}
