import { z } from "zod";

/**
 * Central, typed access to environment variables.
 * Third-party integration keys are optional so the app boots for local UI work
 * before every service is wired; the features that need them fail loudly at the
 * point of use instead of at import time.
 */
const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),

  DATABASE_URL: z
    .string()
    .default("postgresql://nova:nova@localhost:5432/nova"),
  REDIS_URL: z.string().default("redis://localhost:6379"),

  NEXTAUTH_URL: z.string().url().default("http://localhost:3000"),
  NEXTAUTH_SECRET: z.string().default("dev-insecure-secret-change-me"),
  // Extra browser origins allowed to call the versioned REST API (comma-
  // separated), on top of APP_URL. Native app clients send no Origin and are
  // unaffected by CORS. Leave unset for the default (APP_URL only).
  API_CORS_ORIGINS: z.string().optional(),
  // Ship the Content-Security-Policy in report-only mode (observe violations
  // without blocking). Recommended for the first deploy, then unset to enforce.
  CSP_REPORT_ONLY: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  // First-admin bootstrap: the account with this email is promoted to admin on
  // sign-in. Set it to the deployer's email once, then manage the team in-app.
  BOOTSTRAP_ADMIN_EMAIL: z
    .string()
    .email()
    .optional()
    .transform((v) => v?.trim().toLowerCase()),

  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),

  S3_ENDPOINT: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  CDN_BASE_URL: z.string().optional(),

  // Transactional email (Resend). Both optional so the app boots without them;
  // when RESEND_API_KEY is unset, sendEmail() logs instead of sending. There is
  // deliberately NO default sender — EMAIL_FROM must be an explicitly configured,
  // Resend-verified address (e.g. "Apex Mart <no-reply@buildora.fun>"). If
  // RESEND_API_KEY is set but EMAIL_FROM is missing, sendEmail() fails safe (see
  // lib/email.ts) rather than falling back to an unverified sender.
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  SENTRY_DSN: z.string().optional(),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
});

const parsed = schema.parse(process.env);

/**
 * Production safety net: refuse to boot with the local dev defaults still in
 * place, so a deployment can't silently ship with an insecure session secret or
 * a localhost database. Skipped during `next build` (env is only guaranteed at
 * runtime) and outside production.
 */
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
if (parsed.NODE_ENV === "production" && !isBuildPhase) {
  const problems: string[] = [];
  if (parsed.NEXTAUTH_SECRET === "dev-insecure-secret-change-me")
    problems.push("NEXTAUTH_SECRET is the insecure dev default — set a strong value (`openssl rand -base64 32`).");
  if (parsed.DATABASE_URL.includes("localhost") || parsed.DATABASE_URL.includes("127.0.0.1"))
    problems.push("DATABASE_URL still points at localhost — set your hosted Postgres URL.");
  if (parsed.APP_URL.includes("localhost"))
    problems.push("APP_URL is still http://localhost — set your public site URL.");
  if (parsed.NEXTAUTH_URL.includes("localhost"))
    problems.push("NEXTAUTH_URL is still http://localhost — set your public site URL.");
  if (problems.length) {
    throw new Error(
      "Refusing to start in production with insecure defaults:\n  - " +
        problems.join("\n  - "),
    );
  }
}

export const env = parsed;

/**
 * Google OAuth is offered ONLY when BOTH credentials are configured. Single
 * source of truth for gating the "Continue with Google" button (sign-in +
 * register pages) and the NextAuth Google provider — so a deployment without
 * the env vars never renders a button that would error. Pure predicate so it
 * can be unit-tested without the parsed module-level env.
 */
export function isGoogleConfigured(e: {
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
}): boolean {
  return Boolean(e.GOOGLE_CLIENT_ID && e.GOOGLE_CLIENT_SECRET);
}
export const googleEnabled = isGoogleConfigured(env);

/** Public (browser-safe) values. */
export const publicEnv = {
  stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
};
