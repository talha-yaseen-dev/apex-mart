import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { getCurrentUser } from "@/lib/session";
import { getAddresses } from "@/lib/account";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  // Signed-in shoppers get their saved addresses + contact pre-filled; guests
  // (no account) just see the blank form.
  const user = await getCurrentUser();
  const addresses = user ? await getAddresses(user.id) : [];
  const savedAddresses = addresses.map((a) => ({
    id: a.id,
    label: a.label ?? "Saved address",
    name: a.name ?? "",
    line1: a.line1,
    line2: a.line2 ?? "",
    city: a.city,
  }));
  const defaultContact = user
    ? { name: user.name ?? "", phone: user.phone ?? "", email: user.email ?? "" }
    : undefined;

  return <CheckoutForm savedAddresses={savedAddresses} defaultContact={defaultContact} />;
}
