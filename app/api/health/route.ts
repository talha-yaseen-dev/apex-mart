import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Liveness + readiness probe used by the load balancer / uptime monitor.
 * Returns 200 only when the database responds; Redis is reported but optional.
 */
export async function GET() {
  // Imported lazily so ioredis stays out of this route's static module graph.
  const { getRedis } = await import("@/lib/redis");
  const redis = getRedis();

  const [db, cache] = await Promise.allSettled([
    prisma.$queryRaw`SELECT 1`,
    redis ? redis.ping() : Promise.resolve("skipped"),
  ]);

  const ok = db.status === "fulfilled";
  return NextResponse.json(
    {
      ok,
      db: db.status === "fulfilled" ? "up" : "down",
      redis:
        cache.status === "fulfilled"
          ? cache.value === "skipped"
            ? "not-configured"
            : "up"
          : "down",
      ts: Date.now(),
    },
    { status: ok ? 200 : 503 },
  );
}
