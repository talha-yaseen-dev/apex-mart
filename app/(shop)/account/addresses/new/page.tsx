import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/session";
import { getAddresses } from "@/lib/account";
import { AddressFormPanel } from "@/components/account/AddressFormPanel";

export const metadata: Metadata = {
  title: "Add address",
  robots: { index: false, follow: false },
};

export default async function NewAddressPage() {
  const user = await getCurrentUser();
  if (!user) return null; // layout already guards; satisfies types
  const addresses = await getAddresses(user.id);
  // The first address a user saves becomes their default automatically.
  return <AddressFormPanel isFirst={addresses.length === 0} />;
}
