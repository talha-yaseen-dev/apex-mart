/**
 * Client-safe mapping from NextAuth error codes to human copy for the sign-in
 * screen. Pure (no React / no server-only deps) so it can be imported by the
 * client form AND unit-tested under the Node test runner.
 *
 * Two families of codes arrive here:
 *   - Credentials errors thrown in `authorize` (see lib/auth.ts) or NextAuth's
 *     own "CredentialsSignin".
 *   - OAuth errors NextAuth appends as `?error=<code>` when redirecting back to
 *     the custom sign-in page (Google cancelled, provider/callback failure,
 *     misconfiguration, …). These are collapsed to ONE friendly line — we never
 *     surface a raw provider payload, NextAuth internals, or a stack trace.
 */
import { AUTH_ERRORS } from "./auth-constants";

const GENERIC = "Something went wrong. Please try again.";
const GOOGLE = "Google sign-in couldn't be completed. Please try again.";

/** NextAuth OAuth / sign-in error codes → the single friendly Google message. */
const OAUTH_ERROR_CODES = new Set<string>([
  "OAuthSignin",
  "OAuthCallback",
  "OAuthCreateAccount",
  "OAuthAccountNotLinked",
  "OAuthProfile",
  "Callback",
  "AccessDenied",
  "Configuration",
  "Verification",
]);

/** Credentials-flow codes → their existing copy (unchanged behaviour). Bad
 *  credentials stay deliberately vague — no user enumeration. */
const CREDENTIAL_COPY: Record<string, string> = {
  [AUTH_ERRORS.RATE_LIMITED]: "Too many attempts. Please wait a moment and try again.",
  [AUTH_ERRORS.EMAIL_NOT_VERIFIED]:
    "Please verify your email before signing in — check your inbox for the link.",
  [AUTH_ERRORS.DEACTIVATED]:
    "This account has been deactivated. Contact us if you think this is a mistake.",
  CredentialsSignin: "Incorrect email or password.",
};

export function signInErrorMessage(code?: string | null): string {
  if (!code) return GENERIC;
  if (OAUTH_ERROR_CODES.has(code)) return GOOGLE;
  return CREDENTIAL_COPY[code] ?? GENERIC;
}
