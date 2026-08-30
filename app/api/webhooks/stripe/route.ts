import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { stripe } from "@/lib/stripe";
import { captureOrder, failOrder } from "@/lib/orders";
import { notifyOrderConfirmed } from "@/lib/notify";

export const dynamic = "force-dynamic";

/**
 * Stripe webhook — the source of truth for order state. Idempotent: the event id
 * is inserted under a UNIQUE constraint first, so a duplicate delivery returns
 * 200 without reprocessing.
 */
export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();

  if (!stripe || !env.STRIPE_WEBHOOK_SECRET || !sig) {
    return new NextResponse("Stripe is not configured", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return new NextResponse("Invalid signature", { status: 400 });
  }

  // Idempotency guard — UNIQUE(eventId).
  try {
    await prisma.webhookEvent.create({
      data: {
        provider: "stripe",
        eventId: event.id,
        type: event.type,
        payload: event.data.object as unknown as Prisma.InputJsonValue,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    throw e;
  }

  switch (event.type) {
    case "payment_intent.succeeded": {
      const orderId = (event.data.object as Stripe.PaymentIntent).metadata?.orderId;
      if (orderId) {
        await captureOrder(orderId);
        await notifyOrderConfirmed(orderId);
      }
      break;
    }
    case "payment_intent.payment_failed": {
      const orderId = (event.data.object as Stripe.PaymentIntent).metadata?.orderId;
      if (orderId) await failOrder(orderId);
      break;
    }
    default:
      break;
  }

  await prisma.webhookEvent.update({
    where: { eventId: event.id },
    data: { processedAt: new Date() },
  });

  return NextResponse.json({ received: true });
}
