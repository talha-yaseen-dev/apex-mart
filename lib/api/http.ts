import "server-only";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";

/**
 * Shared HTTP helpers for the versioned mobile REST API (app/api/v1/*).
 * Every response is a `{ ok: true, data }` / `{ ok: false, error }` envelope.
 *
 * CORS is restricted to an allowlist rather than `*`: a browser origin only
 * receives `Access-Control-Allow-Origin` when it exactly matches APP_URL, an
 * `API_CORS_ORIGINS` entry, or (in development) localhost. Native app clients
 * send no `Origin` header and are not subject to CORS, so they are unaffected.
 * The API is Bearer-authenticated (no cookies), so credentials are never
 * combined with the allowlist.
 */
const ALLOWED_ORIGINS: ReadonlySet<string> = new Set(
  [
    env.APP_URL,
    ...(env.API_CORS_ORIGINS?.split(",").map((s) => s.trim()) ?? []),
    ...(env.NODE_ENV !== "production"
      ? [
          "http://localhost:3000",
          "http://localhost:8081", // Expo web
          "http://localhost:19006", // Expo web (classic)
          "http://localhost:19000",
        ]
      : []),
  ]
    .filter(Boolean)
    .map((o) => o.replace(/\/$/, "")),
);

const BASE_CORS: Record<string, string> = {
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
};

function isAllowedOrigin(origin: string | null): origin is string {
  return Boolean(origin) && ALLOWED_ORIGINS.has(origin!.replace(/\/$/, ""));
}

/** Reflect the request's Origin onto the response only if it is allowlisted. */
function applyCors(res: NextResponse, req: Request): NextResponse {
  for (const [k, v] of Object.entries(BASE_CORS)) res.headers.set(k, v);
  const origin = req.headers.get("origin");
  if (isAllowedOrigin(origin)) {
    res.headers.set("Access-Control-Allow-Origin", origin);
  }
  return res;
}

/** A typed failure that `handle` turns into a JSON error with the given status. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ ok: true, data }, { status });
}

export function fail(status: number, error: string): NextResponse {
  return NextResponse.json({ ok: false, error }, { status });
}

/** CORS preflight — export as `OPTIONS` from any route that needs it. */
export function preflight(req: Request): NextResponse {
  return applyCors(new NextResponse(null, { status: 204 }), req);
}

/**
 * Request-body size ceilings (bytes). Most JSON is tiny; the exceptions are the
 * admin/profile payloads that inline images as data URLs. Bounding the body
 * keeps a single request from exhausting memory.
 */
export const MAX_JSON_BYTES = 1_048_576; // 1 MB — default for ordinary JSON
export const MAX_IMAGE_JSON_BYTES = 32 * 1_048_576; // product galleries (up to 8 inline images)
export const MAX_AVATAR_JSON_BYTES = 5 * 1_048_576; // a single inline avatar

/**
 * Parse a JSON body, tolerating an empty/invalid one (returns `{}`), and reject
 * anything larger than `maxBytes` with a 413 (checked against both the declared
 * Content-Length and the actual decoded size).
 */
export async function readJson(
  req: Request,
  maxBytes: number = MAX_JSON_BYTES,
): Promise<Record<string, unknown>> {
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new ApiError(413, "Request body is too large.");
  }
  let text: string;
  try {
    text = await req.text();
  } catch {
    return {};
  }
  if (Buffer.byteLength(text) > maxBytes) {
    throw new ApiError(413, "Request body is too large.");
  }
  if (!text) return {};
  try {
    const body = JSON.parse(text);
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/**
 * Wrap a route handler so thrown `ApiError`s become typed responses and any
 * other throw becomes a logged 500 — handlers stay focused on the happy path.
 * The allowlisted CORS headers are attached to every response here (and in
 * `preflight`), so individual `ok`/`fail` calls don't need to think about them.
 */
export function handle<C = unknown>(
  fn: (req: Request, ctx: C) => Promise<NextResponse>,
): (req: Request, ctx: C) => Promise<NextResponse> {
  return async (req, ctx) => {
    try {
      return applyCors(await fn(req, ctx), req);
    } catch (e) {
      if (e instanceof ApiError) return applyCors(fail(e.status, e.message), req);
      console.error("[api] unhandled error", e);
      return applyCors(fail(500, "Something went wrong. Please try again."), req);
    }
  };
}
