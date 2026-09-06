import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getAddresses } from "@/lib/account";
import { AddressFormPanel } from "@/components/account/AddressFormPanel";

export const metadata: Metadata = {
  title: "Edit address",
  robots: { index: false, follow: false },
};

export default async function EditAddressPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return null; // layout already guards; satisfies types
  // Resolve from THIS user's addresses so one can't edit another user's.
  const addresses = await getAddresses(user.id);
  const address = addresses.find((a) => a.id === id);
  if (!address) notFound();
  return <AddressFormPanel initial={address} />;
}
