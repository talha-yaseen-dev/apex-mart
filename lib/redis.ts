import "server-only";
import Redis from "ioredis";
import { env } from "@/lib/env";

/**
 * Lazy, fail-soft Redis singleton. If Redis is unreachable (e.g. local UI work
 * without the container up), callers fall back to in-memory behavior rather
 * than crashing — see lib/rate-limit.ts.
 */
let client: Redis | null = null;
let disabled = false;

export function getRedis(): Redis | null {
  if (disabled) return null;
  if (client) return client;
  try {
    client = new Redis(env.REDIS_URL, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 500,
      retryStrategy: () => null,
    });
    client.on("error", () => {
      /* swallow — callers handle the fallback */
    });
    return client;
  } catch {
    disabled = true;
    return null;
  }
}
