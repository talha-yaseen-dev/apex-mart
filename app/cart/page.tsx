import type { Metadata } from "next";
import { CartView } from "@/components/cart/CartView";

export const metadata: Metadata = {
  title: "Your cart",
  // Cart is user-specific — keep it out of the index (design principle).
  robots: { index: false, follow: true },
};

export default function CartPage() {
  return <CartView />;
}
