"use server";

import { clientIp } from "@/lib/request-ip";
import { rateLimit } from "@/lib/rate-limit";
import { normalizePhone } from "@/lib/phone";
import { fetchOrder, type OrderView, type TrackOrder } from "@/lib/order-access";

/**
 * Public guest order lookup for /track. Matches by ref AND phone (no cookie —
 * anyone can look up any order they can prove with a phone). Rate-limited per
 * IP; returns the same generic message whether the ref is wrong or the phone
 * doesn't match, so refs can't be probed.
 */
export async function lookupOrder(input: {
  ref: string;
  phone: string;
}): Promise<{ ok: true; order: TrackOrder } | { ok: false; error: string }> {
  const ip = await clientIp();
  const rl = await rateLimit(`track:${ip}`, 5, 60);
  if (!rl.allowed) {
    return {
      ok: false,
      error: `Too many attempts — please wait ${rl.retryAfter}s and try again.`,
    };
  }

  const ref = (input.ref ?? "").trim().toUpperCase();
  const phone = normalizePhone(input.phone ?? "");
  if (!ref || !phone) {
    return { ok: false, error: "Enter your order reference and phone number." };
  }

  const order = await fetchOrder(ref, input.phone, { ignoreCookie: true });
  if (!order) {
    return { ok: false, error: "Order not found, or the details don't match." };
  }

  const clone: Partial<OrderView> = { ...order };
  delete clone.userId;
  return { ok: true, order: clone as TrackOrder };
}
