"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ProductStatus } from "@prisma/client";
import { setProductStatusAction } from "@/lib/actions/admin";

const STATUS_LABEL: Record<ProductStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  ARCHIVED: "Archived",
};

export function ProductStatusSelect({
  productId,
  status,
  canEdit = true,
}: {
  productId: string;
  status: ProductStatus;
  canEdit?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  // Publishing is a manager/admin capability; without it the status is read-only.
  if (!canEdit) {
    return (
      <span className="inline-flex h-8 items-center rounded-md border bg-muted px-2 text-[12px] font-semibold text-muted-foreground">
        {STATUS_LABEL[status]}
      </span>
    );
  }

  return (
    <select
      value={status}
      disabled={pending}
      onChange={(e) =>
        start(async () => {
          await setProductStatusAction(productId, e.target.value as ProductStatus);
          router.refresh();
        })
      }
      className="h-8 cursor-pointer rounded-md border bg-card px-2 text-[12px] font-semibold focus:border-primary focus:outline-none"
    >
      <option value="DRAFT">Draft</option>
      <option value="ACTIVE">Active</option>
      <option value="ARCHIVED">Archived</option>
    </select>
  );
}
