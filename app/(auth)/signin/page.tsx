import type { Metadata } from "next";
import { SignInForm } from "@/components/auth/SignInForm";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Mart Shop account.",
  robots: { index: false, follow: true },
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function SignInPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  return <SignInForm callbackUrl={one(sp.callbackUrl)} initialError={one(sp.error)} />;
}
