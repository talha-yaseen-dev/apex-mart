import type { Metadata } from "next";
import { SignInForm } from "@/components/auth/SignInForm";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Apex Mart account.",
  robots: { index: false, follow: true },
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function SignInPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const googleEnabled = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
  return (
    <SignInForm
      callbackUrl={one(sp.callbackUrl)}
      initialError={one(sp.error)}
      googleEnabled={googleEnabled}
    />
  );
}
