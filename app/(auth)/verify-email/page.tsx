import type { Metadata } from "next";
import { z } from "zod";
import { VerifyEmailForm } from "@/components/auth/VerifyEmailForm";
import { AuthNotice } from "@/components/auth/AuthUI";

export const metadata: Metadata = {
  title: "Verify email",
  robots: { index: false, follow: false },
};

// Always dynamic — this screen drives a live verification flow, never cached.
export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const emailParam = z.string().trim().toLowerCase().email();

/**
 * Email verification now happens with a 6-digit code (see lib/otp.ts) — there is
 * no verification LINK and no token is consumed here (the legacy /api/auth/verify
 * route has been removed, so an old link can never silently verify an account).
 *
 * Entry: ?email=<address> renders the OTP form (used when an unverified sign-in
 * sends the user here). Without a valid email we can't target a code, so we show
 * a neutral notice pointing back to sign-in.
 */
export default async function VerifyEmailPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const parsed = emailParam.safeParse(one(sp.email));

  if (!parsed.success) {
    return (
      <AuthNotice title="Verify your email" ctaHref="/signin" ctaLabel="Go to sign in">
        Enter your email on the sign-in page and we’ll send a 6-digit verification code to your
        inbox.
      </AuthNotice>
    );
  }

  // Arrived here (not straight from registration) → let the user request a code.
  return <VerifyEmailForm email={parsed.data} />;
}
