import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Middleware does exactly one job: gate the two authenticated surfaces from the
 * httpOnly session JWT, before the request reaches a page.
 *
 *   /account/*  → any signed-in user
 *   /admin/*    → members of the internal staff directory (isEmployee)
 *
 * Fine-grained capability inside /admin is still enforced per-feature server
 * side (RBAC `authorize()`), and every mutation re-checks authorization — the
 * middleware is only the coarse first gate.
 *
 * It deliberately does NOT run on public storefront routes, API routes, or
 * static assets (see `matcher`). Security headers, including the CSP, are static
 * and applied by next.config `headers()` for every response, so there is no need
 * for per-request work on the pages that must stay fast and CDN-cacheable.
 */
export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const authed = pathname.startsWith("/admin")
    ? token?.isEmployee === true
    : Boolean(token);

  if (!authed) {
    const signin = new URL("/signin", req.url);
    signin.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(signin);
  }
  return NextResponse.next();
}

export const config = {
  // Only the authenticated surfaces need the middleware. Everything else —
  // storefront pages, product pages, the public catalog/image APIs, static
  // assets — skips it entirely and can be served statically / from the CDN.
  matcher: ["/admin/:path*", "/account/:path*"],
};
