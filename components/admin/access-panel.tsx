"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  requestElevationAction,
  revokeAssignmentAction,
  assignRoleAction,
  inviteMemberAction,
  removeMemberAction,
  transferPrimaryAdminAction,
  setAccountActiveAction,
} from "@/lib/actions/access";

type Identity = {
  name: string;
  email: string;
  baselineRole: string;
  isEmployee: boolean;
};
type Grant = {
  id: string;
  role: string;
  description: string;
  reason: string | null;
  expiresAt: string | null;
};
type Role = { name: string; description: string };
type MemberRole = {
  assignmentId: string;
  name: string;
  grantsAdmin: boolean;
  expiresAt: string | null;
};
type TeamMember = {
  id: string;
  name: string;
  email: string;
  isSelf: boolean;
  isAdmin: boolean;
  isPrimaryAdmin: boolean;
  deactivated: boolean;
  roles: MemberRole[];
};

function timeLeft(iso: string, now: number): string {
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return "expired";
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return m > 0 ? `${m}m ${s}s left` : `${s}s left`;
}

export function AccessPanel({
  identity,
  permissions,
  grants,
  requestableRoles,
  canManage,
  manageableRoles,
  team,
  adminCount,
  viewerIsPrimary,
}: {
  identity: Identity;
  permissions: string[];
  grants: Grant[];
  requestableRoles: Role[];
  canManage: boolean;
  manageableRoles: Role[];
  team: TeamMember[];
  adminCount: number;
  viewerIsPrimary: boolean;
}) {
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  const [role, setRole] = useState(requestableRoles[0]?.name ?? "");
  const [minutes, setMinutes] = useState("30");
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");
  const [pending, setPending] = useState(false);

  // Live countdown for JIT grants; refresh server data when one lapses.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (grants.some((g) => g.expiresAt && new Date(g.expiresAt).getTime() <= now)) {
      router.refresh();
    }
  }, [now, grants, router]);

  async function request() {
    setErr("");
    setPending(true);
    const res = await requestElevationAction({
      roleName: role,
      minutes: parseInt(minutes, 10) || 0,
      reason,
    });
    setPending(false);
    if (res.ok) {
      setReason("");
      router.refresh();
    } else {
      setErr(res.error);
    }
  }

  async function revoke(id: string) {
    const res = await revokeAssignmentAction(id);
    if (!res.ok) setErr(res.error);
    router.refresh();
  }

  return (
    <div className="animate-fade max-w-3xl">
      <h1 className="mb-1.5 font-display text-2xl font-bold tracking-tight">
        Access &amp; team
      </h1>
      <p className="mb-5 text-[13px] text-muted-foreground">
        Capabilities come from your role assignments, not a standing admin flag.
        Elevated access is time-boxed and audited.
      </p>

      {/* Identity */}
      <div className="mb-4 rounded-xl border bg-card p-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-full bg-primary-tint text-sm font-bold text-primary-hover">
            {identity.name.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-semibold">{identity.name}</div>
            <div className="text-[12.5px] text-muted-foreground">{identity.email}</div>
          </div>
          {identity.isEmployee && (
            <span className="rounded-full bg-[oklch(0.94_0.05_150)] px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-[oklch(0.42_0.1_150)]">
              Staff directory
            </span>
          )}
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">
            {identity.baselineRole}
          </span>
        </div>
        <div className="mt-3.5 border-t pt-3">
          <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Effective permissions
          </div>
          <div className="flex flex-wrap gap-1.5">
            {permissions.map((p) => (
              <span key={p} className="rounded-md bg-primary-tint px-2 py-0.5 font-mono text-[11.5px] font-semibold text-primary-hover">
                {p === "*" ? "* (all)" : p}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Active grants */}
      <div className="mb-4 overflow-hidden rounded-xl border bg-card">
        <div className="border-b px-4 py-3 text-sm font-bold">Active role grants</div>
        {grants.length === 0 ? (
          <div className="px-4 py-6 text-center text-[13px] text-muted-foreground">
            No standing role assignments — you&apos;re running on your baseline permissions.
          </div>
        ) : (
          grants.map((g) => (
            <div key={g.id} className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0">
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-semibold">{g.role}</div>
                <div className="text-[12px] text-muted-foreground">
                  {g.description}
                  {g.reason ? ` · “${g.reason}”` : ""}
                </div>
              </div>
              {g.expiresAt ? (
                <span className="rounded-full bg-[oklch(0.98_0.02_70)] px-2.5 py-0.5 text-[11px] font-semibold text-[oklch(0.5_0.1_65)]">
                  ⏱ {timeLeft(g.expiresAt, now)}
                </span>
              ) : (
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                  standing
                </span>
              )}
              <button
                onClick={() => revoke(g.id)}
                className="text-[12.5px] font-semibold text-destructive hover:underline"
              >
                Revoke
              </button>
            </div>
          ))
        )}
      </div>

      {/* Break-glass elevation */}
      {requestableRoles.length > 0 && (
        <div className="mb-4 rounded-xl border bg-card p-4">
          <div className="mb-1 text-sm font-bold">Request elevated access (break-glass)</div>
          <p className="mb-3 text-[12.5px] text-muted-foreground">
            Grant yourself a role for a limited window. The request and its reason
            are written to the audit log.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_120px]">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="h-10 cursor-pointer rounded-lg border bg-card px-3 text-[13px] focus:border-primary focus:outline-none"
            >
              {requestableRoles.map((r) => (
                <option key={r.name} value={r.name}>
                  {r.name} — {r.description}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <input
                value={minutes}
                onChange={(e) => setMinutes(e.target.value.replace(/[^0-9]/g, ""))}
                inputMode="numeric"
                className="h-10 w-full rounded-lg border bg-card px-3 text-[13px] focus:border-primary focus:outline-none"
              />
              <span className="text-[12.5px] text-muted-foreground">min</span>
            </div>
          </div>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (audited) — e.g. refund for ticket #4821"
            className="mt-3 h-10 w-full rounded-lg border bg-card px-3 text-[13px] focus:border-primary focus:outline-none"
          />
          <div className="mt-1 min-h-4 text-xs text-destructive">{err}</div>
          <button
            onClick={request}
            disabled={pending || !role}
            className="h-10 rounded-lg bg-primary px-5 text-[13px] font-bold text-white hover:bg-primary-hover disabled:opacity-60"
          >
            {pending ? "Requesting…" : "Elevate"}
          </button>
        </div>
      )}

      {/* Admin: team management */}
      {canManage && (
        <TeamManagement
          manageableRoles={manageableRoles}
          team={team}
          adminCount={adminCount}
          viewerIsPrimary={viewerIsPrimary}
        />
      )}
    </div>
  );
}

function TeamManagement({
  manageableRoles,
  team,
  adminCount,
  viewerIsPrimary,
}: {
  manageableRoles: Role[];
  team: TeamMember[];
  adminCount: number;
  viewerIsPrimary: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [roleName, setRoleName] = useState(manageableRoles[0]?.name ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<
    | { mode: "promoted" | "invited"; email: string; roleName: string; inviteUrl?: string; emailed: boolean }
    | null
  >(null);
  const [copied, setCopied] = useState(false);

  async function invite() {
    setError("");
    setResult(null);
    setPending(true);
    const res = await inviteMemberAction({ email, roleName });
    setPending(false);
    if (res.ok) {
      setEmail("");
      setResult({
        mode: res.mode,
        email: res.email,
        roleName: res.roleName,
        inviteUrl: res.inviteUrl,
        emailed: res.emailed,
      });
      router.refresh();
    } else {
      setError(res.error);
    }
  }

  return (
    <div className="space-y-4">
      {/* Invite / promote */}
      <div className="rounded-xl border bg-card p-4">
        <div className="mb-1 text-sm font-bold">Add a team member</div>
        <p className="mb-3 text-[12.5px] text-muted-foreground">
          Enter an email and pick a role. People who already have an account are
          promoted into the staff directory; new people get a secure link to set
          their own password — you never handle it.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_170px_auto]">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="teammate@company.com"
            className="h-10 w-full rounded-lg border bg-card px-3 text-[13px] focus:border-primary focus:outline-none"
          />
          <select
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
            className="h-10 cursor-pointer rounded-lg border bg-card px-3 text-[13px] focus:border-primary focus:outline-none"
          >
            {manageableRoles.map((r) => (
              <option key={r.name} value={r.name}>
                {r.name}
              </option>
            ))}
          </select>
          <button
            onClick={invite}
            disabled={pending || !email || !roleName}
            className="h-10 rounded-lg bg-primary px-5 text-[13px] font-bold text-white hover:bg-primary-hover disabled:opacity-60"
          >
            {pending ? "Adding…" : "Add member"}
          </button>
        </div>
        <div className="mt-1 min-h-4 text-xs text-destructive">{error}</div>

        {result && (
          <div className="mt-1 rounded-lg border border-[oklch(0.88_0.05_150)] bg-[oklch(0.97_0.03_150)] p-3 text-[12.5px] text-[oklch(0.36_0.09_150)]">
            {result.mode === "promoted" ? (
              <span>
                <strong>{result.email}</strong> was promoted to <strong>{result.roleName}</strong> and can
                sign in with their existing password.
              </span>
            ) : (
              <div>
                <div>
                  Invited <strong>{result.email}</strong> as <strong>{result.roleName}</strong>.{" "}
                  {result.emailed
                    ? "An invite email with a set-password link was sent."
                    : "Copy the link below and share it securely — email isn’t configured."}
                </div>
                {result.inviteUrl && (
                  <div className="mt-2 flex items-center gap-2">
                    <code className="min-w-0 flex-1 truncate rounded-md bg-white/70 px-2 py-1.5 font-mono text-[11px] text-[oklch(0.3_0.06_180)]">
                      {result.inviteUrl}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(result.inviteUrl!);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      }}
                      className="shrink-0 rounded-md border bg-card px-2.5 py-1.5 text-[11.5px] font-semibold hover:bg-muted"
                    >
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Directory */}
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b px-4 py-3 text-sm font-bold">
          Team <span className="font-normal text-muted-foreground">· {team.length} members</span>
        </div>
        {team.map((m) => (
          <MemberRow
            key={m.id}
            member={m}
            manageableRoles={manageableRoles}
            adminCount={adminCount}
            viewerIsPrimary={viewerIsPrimary}
            onChanged={() => router.refresh()}
          />
        ))}
      </div>
    </div>
  );
}

function MemberRow({
  member,
  manageableRoles,
  adminCount,
  viewerIsPrimary,
  onChanged,
}: {
  member: TeamMember;
  manageableRoles: Role[];
  adminCount: number;
  viewerIsPrimary: boolean;
  onChanged: () => void;
}) {
  const held = new Set(member.roles.map((r) => r.name));
  const addable = manageableRoles.filter((r) => !held.has(r.name));
  const [addRole, setAddRole] = useState(addable[0]?.name ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Protect the last admin: their admin role can't be revoked and they can't be
  // removed from the directory (the server enforces this too).
  const lastAdmin = member.isAdmin && adminCount <= 1;

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setErr("");
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (!res.ok) setErr(res.error ?? "Something went wrong.");
    else onChanged();
  }

  return (
    <div className="border-b px-4 py-3 last:border-b-0">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[13px] font-medium">
            {member.name}
            {member.isSelf && (
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                you
              </span>
            )}
            {member.isAdmin && (
              <span className="rounded bg-primary-tint px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary-hover">
                admin
              </span>
            )}
            {member.isPrimaryAdmin && (
              <span className="rounded bg-[oklch(0.93_0.09_85)] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[oklch(0.45_0.11_75)]">
                primary
              </span>
            )}
            {member.deactivated && (
              <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-destructive">
                deactivated
              </span>
            )}
          </div>
          <div className="text-[11.5px] text-muted-foreground">{member.email}</div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {viewerIsPrimary && !member.isSelf && member.isAdmin && !member.isPrimaryAdmin && (
            <button
              onClick={() => run(() => transferPrimaryAdminAction(member.id))}
              disabled={busy}
              title="Transfer primary (owner) status to this admin"
              className="text-[12px] font-semibold text-primary-hover hover:underline disabled:opacity-40"
            >
              Make primary
            </button>
          )}
          {viewerIsPrimary && !member.isSelf && !member.isPrimaryAdmin && (
            <button
              onClick={() => run(() => setAccountActiveAction(member.id, member.deactivated))}
              disabled={busy}
              className={
                member.deactivated
                  ? "text-[12px] font-semibold text-primary-hover hover:underline disabled:opacity-40"
                  : "text-[12px] font-semibold text-destructive hover:underline disabled:opacity-40"
              }
            >
              {member.deactivated ? "Reactivate" : "Deactivate"}
            </button>
          )}
          <button
            onClick={() => run(() => removeMemberAction(member.id))}
            disabled={busy || lastAdmin}
            title={lastAdmin ? "Grant another admin first" : "Remove from staff"}
            className="text-[12px] font-semibold text-destructive hover:underline disabled:opacity-40 disabled:no-underline"
          >
            Remove
          </button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {member.roles.length === 0 && (
          <span className="text-[11.5px] text-muted-foreground">no roles — no access</span>
        )}
        {member.roles.map((r) => {
          const lockedRole = r.grantsAdmin && lastAdmin;
          return (
            <span
              key={r.assignmentId}
              className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground"
            >
              {r.name}
              {r.expiresAt && <span className="text-[10px] opacity-70">· temp</span>}
              {!lockedRole && (
                <button
                  onClick={() => run(() => revokeAssignmentAction(r.assignmentId))}
                  disabled={busy}
                  title="Revoke role"
                  className="ml-0.5 text-destructive hover:text-destructive/70"
                >
                  ×
                </button>
              )}
            </span>
          );
        })}

        {addable.length > 0 && (
          <span className="ml-auto flex items-center gap-1.5">
            <select
              value={addRole}
              onChange={(e) => setAddRole(e.target.value)}
              className="h-7 cursor-pointer rounded-md border bg-card px-2 text-[11.5px] focus:border-primary focus:outline-none"
            >
              {addable.map((r) => (
                <option key={r.name} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => run(() => assignRoleAction({ userId: member.id, roleName: addRole }))}
              disabled={busy || !addRole}
              className="h-7 rounded-md border bg-card px-2.5 text-[11.5px] font-semibold hover:bg-muted disabled:opacity-50"
            >
              Add role
            </button>
          </span>
        )}
      </div>
      {err && <div className="mt-1 text-[11.5px] text-destructive">{err}</div>}
    </div>
  );
}
