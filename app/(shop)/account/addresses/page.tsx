import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/session";
import { getAddresses } from "@/lib/account";
import { AddressManager } from "@/components/account/AddressManager";

export const metadata: Metadata = {
  title: "Addresses",
  robots: { index: false, follow: false },
};

export default async function AddressesPage() {
  const user = await getCurrentUser();
  if (!user) return null; // layout already guards; satisfies types

  const addresses = await getAddresses(user.id);

  return <AddressManager addresses={addresses} />;
}
