import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

/** Append an immutable audit-log entry for a staff/admin mutation. */
export async function logAudit(opts: {
  actorId?: string | null;
  action: string;
  targetType: string;
  targetId: string;
  diff?: Prisma.InputJsonValue;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId: opts.actorId ?? null,
      action: opts.action,
      targetType: opts.targetType,
      targetId: opts.targetId,
      diff: opts.diff ?? {},
    },
  });
}
