"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { Address } from "@prisma/client";
import { AddressForm } from "./AddressForm";

/**
 * Full-page add/edit address (replaces the old right-hand Sheet). On save it
 * returns to the address book, where the new/updated card appears.
 */
export function AddressFormPanel({ initial, isFirst }: { initial?: Address; isFirst?: boolean }) {
  const router = useRouter();
  const back = () => {
    router.push("/account/addresses");
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-xl">
      <Link
        href="/account/addresses"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden /> Back to addresses
      </Link>
      <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-foreground">
        {initial ? "Edit address" : "Add a new address"}
      </h1>
      <p className="mb-5 text-sm text-muted-foreground">
        {initial
          ? "Update the delivery details for this address."
          : "Save a delivery address to reuse at checkout."}
      </p>
      <div className="rounded-2xl border border-border bg-card p-5">
        <AddressForm initial={initial} defaultIsDefault={isFirst} onSuccess={back} />
      </div>
    </div>
  );
}
