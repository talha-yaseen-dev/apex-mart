import type { Metadata } from "next";
import { TokenType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { consumeToken } from "@/lib/tokens";
import { AuthSuccess, AuthNotice } from "@/components/auth/AuthUI";

export const metadata: Metadata = {
  title: "Verify email",
  robots: { index: false, follow: false },
};

// The page consumes a single-use token, so it must never be cached.
export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/**
 * Email-verification landing page. Two entry shapes:
 *   ?token=…   the link from the verification email — consume it here.
 *   ?status=…  a redirect from the legacy /api/auth/verify route (display only).
 *
 * All verification decisions are server-side. On failure we stay generic
 * (invalid / expired / already-used are indistinguishable after single-use
 * consumption) and never leak which case it was.
 */
export default async function VerifyEmailPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const token = one(sp.token);
  const status = one(sp.status);

  let verified = status === "success";
  if (token) {
    const email = await consumeToken(token, TokenType.EMAIL_VERIFY);
    if (email) {
      // Idempotent: marking an already-verified account verified again is a no-op.
      await prisma.user
        .update({ where: { email }, data: { emailVerified: new Date() } })
        .catch(() => {
          /* account removed between issuing and verifying — treat as invalid */
        });
      verified = true;
    }
  }

  if (verified) {
    return (
      <AuthSuccess title="Email verified" ctaHref="/signin" ctaLabel="Continue to sign in">
        Your Apex Mart account is ready. Sign in to start shopping.
      </AuthSuccess>
    );
  }

  return (
    <AuthNotice title="This link didn’t work" ctaHref="/signin" ctaLabel="Go to sign in">
      This verification link is invalid, has expired, or has already been used. Sign in to
      request a fresh link, or create a new account if you don’t have one yet.
    </AuthNotice>
  );
}
