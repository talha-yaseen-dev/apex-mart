import { fail, preflight, handle } from "@/lib/api/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = (req: Request) => preflight(req);

/**
 * DISABLED. This endpoint previously created an inactive User (emailVerified
 * null) and verified it later — an alternate public registration path that
 * bypassed 6-digit email verification. Registration now REQUIRES the verified
 * web flow (send code → enter code → create account), so no account is ever
 * created before a code is confirmed. Nothing in the app uses this route; it
 * returns 410 Gone rather than being silently removed, to make the disposition
 * explicit for any external caller. It creates no account.
 */
export const POST = handle(async () =>
  fail(410, "Registration has moved. Please create your account in the app."),
);
