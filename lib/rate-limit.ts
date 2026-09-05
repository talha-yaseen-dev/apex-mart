import "server-only";
import { getRedis } from "@/lib/redis";

export type RateResult = {
  allowed: boolean;
  remaining: number;
  retryAfter: number; // seconds until the window frees up
};

/**
 * Sliding-window rate limiter. Backed by a Redis sorted set in production
 * (per the Security spec — checkout 10/min/user, search 30/min/IP, sign-in
 * lockout); falls back to an in-process window when Redis is unavailable.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateResult> {
  const redis = getRedis();
  if (redis) {
    try {
      return await redisWindow(redis, key, limit, windowSec);
    } catch {
      /* fall through to memory */
    }
  }
  return memoryWindow(key, limit, windowSec);
}

async function redisWindow(
  redis: NonNullable<ReturnType<typeof getRedis>>,
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateResult> {
  const now = Date.now();
  const windowMs = windowSec * 1000;
  const member = `${now}-${Math.random()}`;
  const redisKey = `rl:${key}`;

  const pipeline = redis.multi();
  pipeline.zremrangebyscore(redisKey, 0, now - windowMs);
  pipeline.zadd(redisKey, now, member);
  pipeline.zcard(redisKey);
  pipeline.pexpire(redisKey, windowMs);
  const res = await pipeline.exec();
  const count = (res?.[2]?.[1] as number) ?? 0;

  const allowed = count <= limit;
  if (!allowed) await redis.zrem(redisKey, member);
  return {
    allowed,
    remaining: Math.max(0, limit - count),
    retryAfter: allowed ? 0 : windowSec,
  };
}

/**
 * Reset a rate-limit window (both backends). Used when issuing a NEW
 * verification code so the wrong-attempt counter for the previous code no
 * longer blocks the fresh one — the resend itself is separately rate-limited,
 * so this can't be abused to grant unlimited guesses.
 */
export async function clearRateLimit(key: string): Promise<void> {
  memory.delete(key);
  const redis = getRedis();
  if (redis) {
    try {
      await redis.del(`rl:${key}`);
    } catch {
      /* best-effort */
    }
  }
}

// ── In-memory fallback ────────────────────────────────────────
const memory = new Map<string, number[]>();

function memoryWindow(
  key: string,
  limit: number,
  windowSec: number,
): RateResult {
  const now = Date.now();
  const windowMs = windowSec * 1000;
  const hits = (memory.get(key) ?? []).filter((t) => t > now - windowMs);
  hits.push(now);
  memory.set(key, hits);

  const allowed = hits.length <= limit;
  const oldest = hits[0] ?? now;
  return {
    allowed,
    remaining: Math.max(0, limit - hits.length),
    retryAfter: allowed ? 0 : Math.ceil((oldest + windowMs - now) / 1000),
  };
}
