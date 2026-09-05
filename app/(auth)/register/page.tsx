import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { googleEnabled } from "@/lib/env";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create an Apex Mart account to track orders and save your details.",
  robots: { index: false, follow: true },
};

export default function RegisterPage() {
  // Google is only offered when both OAuth env vars are configured (see
  // `googleEnabled`), so the button never appears (or errors) without it.
  return <RegisterForm googleEnabled={googleEnabled} />;
}
