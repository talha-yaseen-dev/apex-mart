import "server-only";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { formatMoney } from "@/lib/utils";
import {
  orderConfirmedEmail,
  orderRefundedEmail,
  orderShippedEmail,
} from "@/emails/order-emails";

/** Best-effort notifications — a failed email never breaks the order flow. */
async function safe(fn: () => Promise<void>) {
  try {
    await fn();
  } catch (e) {
    logger.error({ err: e }, "notify_failed");
  }
}

export function notifyOrderConfirmed(orderId: string) {
  return safe(async () => {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, user: { select: { email: true, name: true } } },
    });
    if (!order) return;
    const { subject, html } = orderConfirmedEmail({
      name: order.user.name,
      orderNumber: order.orderNumber,
      lines: order.items.map((i) => ({
        label: `${i.productName} × ${i.quantity}`,
        value: formatMoney(i.unitPriceMinor * i.quantity),
      })),
      totalMinor: order.totalMinor,
    });
    await sendEmail({ to: order.user.email, subject, html });
  });
}

export function notifyOrderShipped(orderId: string) {
  return safe(async () => {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { email: true } },
        shipments: { orderBy: { id: "desc" }, take: 1 },
      },
    });
    const shipment = order?.shipments[0];
    if (!order || !shipment) return;
    const { subject, html } = orderShippedEmail({
      orderNumber: order.orderNumber,
      carrier: shipment.carrier,
      tracking: shipment.trackingNumber,
    });
    await sendEmail({ to: order.user.email, subject, html });
  });
}

export function notifyOrderRefunded(orderId: string) {
  return safe(async () => {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: { select: { email: true } } },
    });
    if (!order) return;
    const { subject, html } = orderRefundedEmail({
      orderNumber: order.orderNumber,
      amountMinor: order.totalMinor,
    });
    await sendEmail({ to: order.user.email, subject, html });
  });
}
