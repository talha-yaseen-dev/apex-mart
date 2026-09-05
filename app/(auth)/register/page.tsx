import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create an Apex Mart account to track orders and save your details.",
  robots: { index: false, follow: true },
};

export default function RegisterPage() {
  // Account creation is email/password only — Google sign-in lives on /signin.
  return <RegisterForm />;
}
