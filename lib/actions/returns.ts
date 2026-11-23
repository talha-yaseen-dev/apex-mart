"use server";

import { getCurrentUser } from "@/lib/session";
import { getOrderForUser } from "@/lib/account";
import { logger } from "@/lib/logger";
import { formatPKR, formatDate } from "@/lib/format";
import { reasonLabel, MAX_RETURN_NOTE } from "@/lib/return-reasons";

type Result = { ok: true } | { ok: false; error: string };

/**
 * Record a "report a problem" request for an order.
 *
 * This is a lightweight contact flow, not a persisted return workflow: Nova's
 * schema has no customer return-request entity and the store has no fulfilment
 * path, so we persist nothing (no schema changes, no fabricated record). Mart
 * Shop also has no email inbox — the store is reached via WhatsApp. So this
 * action records the request server-side (a structured log line, plus the full
 * body printed to the console in dev for inspection) and the success screen
 * offers the customer a pre-filled WhatsApp link to contact the store directly.
 * The order and user are re-loaded server-side — the client only supplies the
 * order id, reason, and note.
 */
export async function requestReturnAction(
  orderId: string,
  input: { reason: string; note?: string },
): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please sign in to continue." };

  const label = reasonLabel(input.reason);
  if (!label) return { ok: false, error: "Please choose a reason." };

  const note = (input.note ?? "").trim();
  if (note.length > MAX_RETURN_NOTE) {
    return { ok: false, error: `Please keep the note under ${MAX_RETURN_NOTE} characters.` };
  }

  // Authoritative order load — scoped to this user, so someone else's order (or
  // a bad id) resolves to null and is rejected.
  const order = await getOrderForUser(orderId, user.id);
  if (!order) return { ok: false, error: "We couldn't find that order." };

  const items = order.items
    .map(
      (it) =>
        `  - ${it.qty}× ${it.name}${it.variantLabel ? ` (${it.variantLabel})` : ""} — ${formatPKR(
          it.lineTotalMinor,
        )}`,
    )
    .join("\n");

  const body = [
    `Customer: ${user.name ?? "—"} <${user.email}>${
      order.customerPhone ? ` · ${order.customerPhone}` : ""
    }`,
    `Order ref: ${order.number}`,
    `Placed: ${formatDate(order.placedDate)}`,
    `Total: ${formatPKR(order.totalMinor)}`,
    ``,
    `Reason: ${label}`,
    `Note: ${note || "—"}`,
    ``,
    `Items:`,
    items,
  ].join("\n");

  // No email is sent — Apex Tyres is contacted via WhatsApp. In dev, print the
  // full request so it's inspectable; always emit a structured log line.
  if (process.env.NODE_ENV !== "production") {
    console.log(`\n📨  [dev] return request for ${order.number}\n${body}\n`);
  }
  logger.info(
    { orderId: order.id, orderNumber: order.number, reason: label },
    "return_request",
  );

  return { ok: true };
}
