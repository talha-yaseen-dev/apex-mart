import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create an Apex Mart account to track orders and save your details.",
  robots: { index: false, follow: true },
};

export default function RegisterPage() {
  // Google is only offered when both OAuth env vars are configured, so the
  // button never appears (or errors) on deployments without it.
  const googleEnabled = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
  return <RegisterForm googleEnabled={googleEnabled} />;
}
