import type { Metadata } from "next";
import { ResetForm } from "@/components/auth/ResetForm";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Set a new password for your Mart Shop account.",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function ResetPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  return <ResetForm token={one(sp.token)} />;
}
