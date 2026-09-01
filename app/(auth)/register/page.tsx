import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create a Mart Shop account to track orders and save your details.",
  robots: { index: false, follow: true },
};

export default function RegisterPage() {
  return <RegisterForm />;
}
