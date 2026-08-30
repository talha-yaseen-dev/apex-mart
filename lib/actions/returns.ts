"use server";

import { revalidatePath } from "next/cache";
import { OrderStatus, PaymentStatus, RefundStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

const schema = z.object({
  orderId: z.string().min(1),
  itemIds: z.array(z.string()).min(1, "Select at least one item to return."),
  reason: z.string().min(1, "Choose a reason."),
  note: z.string().optional().default(""),
});

/**
 * Request a return (RMA). Modeled as a PENDING Refund against the order's
 * captured payment; staff approve/settle it in the admin (Phase 6).
 */
export async function requestReturnAction(input: unknown) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "Please sign in." };
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid request." };
  }
  const { orderId, itemIds, reason, note } = parsed.data;

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: user.id, status: OrderStatus.DELIVERED },
    include: {
      items: true,
      payments: { where: { status: PaymentStatus.SUCCEEDED }, take: 1 },
    },
  });
  if (!order) return { ok: false as const, error: "This order isn’t eligible for a return." };
  const payment = order.payments[0];
  if (!payment) return { ok: false as const, error: "No captured payment to refund against." };

  const selected = order.items.filter((i) => itemIds.includes(i.id));
  if (!selected.length) return { ok: false as const, error: "Select at least one item." };
  const amountMinor = selected.reduce((s, i) => s + i.unitPriceMinor * i.quantity, 0);

  const refund = await prisma.refund.create({
    data: {
      paymentId: payment.id,
      amountMinor,
      reason: note ? `${reason}: ${note}` : reason,
      status: RefundStatus.PENDING,
    },
  });

  revalidatePath(`/account/orders/${orderId}`);
  return { ok: true as const, rma: `RMA-${refund.id.slice(-5).toUpperCase()}` };
}
