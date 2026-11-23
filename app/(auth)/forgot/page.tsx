import type { Metadata } from "next";
import { ForgotForm } from "@/components/auth/ForgotForm";

export const metadata: Metadata = {
  title: "Forgot password",
  description: "Request a password reset link for your Apex Tyres account.",
  robots: { index: false, follow: true },
};

export default function ForgotPage() {
  return <ForgotForm />;
}
