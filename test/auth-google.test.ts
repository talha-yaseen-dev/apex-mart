import { describe, it, expect } from "vitest";
import { isGoogleConfigured } from "@/lib/env";
import { signInErrorMessage } from "@/lib/auth-error-copy";
import { landingPathFor } from "@/lib/auth-redirect";

/**
 * Unit coverage for the "Continue with Google" sign-in option. The test runner
 * is Node-only (no jsdom), so these exercise the pure seams the button relies
 * on rather than rendering React: the provider-gating predicate, the OAuth
 * error copy, and the post-login redirect (which must never elevate a Google
 * user to admin).
 */

describe("Google provider gating (isGoogleConfigured)", () => {
  it("appears only when BOTH client id and secret are configured", () => {
    expect(isGoogleConfigured({ GOOGLE_CLIENT_ID: "id", GOOGLE_CLIENT_SECRET: "secret" })).toBe(
      true,
    );
  });

  it("is hidden when either or both env vars are missing/empty", () => {
    expect(isGoogleConfigured({})).toBe(false);
    expect(isGoogleConfigured({ GOOGLE_CLIENT_ID: "id" })).toBe(false);
    expect(isGoogleConfigured({ GOOGLE_CLIENT_SECRET: "secret" })).toBe(false);
    expect(isGoogleConfigured({ GOOGLE_CLIENT_ID: "", GOOGLE_CLIENT_SECRET: "" })).toBe(false);
  });
});

describe("sign-in error copy (signInErrorMessage)", () => {
  const GOOGLE_MSG = "Google sign-in couldn't be completed. Please try again.";
  const GENERIC = "Something went wrong. Please try again.";

  it("shows one friendly Google message for every NextAuth OAuth error code", () => {
    for (const code of [
      "OAuthSignin",
      "OAuthCallback",
      "OAuthCreateAccount",
      "OAuthAccountNotLinked",
      "OAuthProfile",
      "Callback",
      "AccessDenied", // user cancelled the Google consent screen
      "Configuration",
      "Verification",
    ]) {
      expect(signInErrorMessage(code)).toBe(GOOGLE_MSG);
    }
  });

  it("leaves email/password copy unchanged", () => {
    expect(signInErrorMessage("CredentialsSignin")).toBe("Incorrect email or password.");
    expect(signInErrorMessage("EMAIL_NOT_VERIFIED")).toMatch(/verify your email/i);
    expect(signInErrorMessage("RATE_LIMITED")).toMatch(/too many attempts/i);
    expect(signInErrorMessage("DEACTIVATED")).toMatch(/deactivated/i);
  });

  it("never leaks provider internals — unknown/raw codes fall back to generic", () => {
    expect(signInErrorMessage("Error: connect ECONNREFUSED 127.0.0.1:5432")).toBe(GENERIC);
    expect(signInErrorMessage("some-unmapped-code")).toBe(GENERIC);
    expect(signInErrorMessage(undefined)).toBe(GENERIC);
    expect(signInErrorMessage(null)).toBe(GENERIC);
    expect(signInErrorMessage("")).toBe(GENERIC);
  });
});

describe("post-login redirect never elevates privilege (landingPathFor)", () => {
  it("routes Google/CUSTOMER users to the storefront, not the admin panel", () => {
    // Google sign-in creates a plain CUSTOMER (lib/auth.ts signIn callback);
    // the client must not send them to /admin.
    expect(landingPathFor({ role: "CUSTOMER", isEmployee: false })).toBe("/");
  });

  it("reaches /admin only for a real ADMIN db role", () => {
    expect(landingPathFor({ role: "ADMIN", isEmployee: true })).toBe("/admin");
    expect(landingPathFor({ role: "CUSTOMER", isEmployee: true })).toBe("/admin/inventory");
  });
});
