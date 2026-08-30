import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { rateLimit } from "@/lib/rate-limit";
import { ipFromHeaders } from "@/lib/request-ip";
import { syncEmployeeDirectory, ensureBootstrapAdmin } from "@/lib/sso";
import { signInSchema } from "@/lib/validations/auth";
import { issueMobileToken } from "@/lib/api/auth";
import { handle, ok, fail, preflight, readJson } from "@/lib/api/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = (req: Request) => preflight(req);

/**
 * Mobile sign-in. Mirrors the credentials provider in lib/auth.ts exactly
 * (rate limit → constant-time password check → deactivation / verification
 * gates → SSO reconcile + bootstrap-admin), then issues a Bearer token.
 */
export const POST = handle(async (req) => {
  const parsed = signInSchema.safeParse(await readJson(req));
  if (!parsed.success) return fail(400, "Enter your email and password.");
  const { email, password } = parsed.data;

  const ip = ipFromHeaders(req.headers);
  const [byEmail, byIp] = await Promise.all([
    rateLimit(`signin:${email}`, 5, 30),
    ip === "unknown"
      ? Promise.resolve({ allowed: true, remaining: 1, retryAfter: 0 })
      : rateLimit(`signin-ip:${ip}`, 30, 30),
  ]);
  if (!byEmail.allowed || !byIp.allowed) {
    return fail(429, "Too many attempts — please wait a moment.");
  }

  const user = await prisma.user.findUnique({ where: { email } });
  // Constant-ish work whether or not the account exists (no enumeration).
  const valid = user
    ? await verifyPassword(user.passwordHash, password)
    : await verifyPassword("$argon2id$v=19$m=19456,t=2,p=1$x$x", password);
  if (!user || !valid) return fail(401, "Incorrect email or password.");
  if (user.deactivatedAt) return fail(403, "This account has been deactivated.");
  if (!user.emailVerified) return fail(403, "Please verify your email before signing in.");

  await syncEmployeeDirectory(user.email);
  const promoted = await ensureBootstrapAdmin(user.email);
  const role = promoted?.role ?? user.role;
  const isEmployee = promoted?.isEmployee ?? user.isEmployee;

  const token = await issueMobileToken({
    id: user.id,
    email: user.email,
    name: user.name,
    role,
    isEmployee,
  });

  return ok({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role,
      isEmployee,
      image: user.image,
      isPrimaryAdmin: user.isPrimaryAdmin,
    },
  });
});
