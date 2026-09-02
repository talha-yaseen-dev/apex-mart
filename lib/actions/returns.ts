"use server";

import { getCurrentUser } from "@/lib/session";
import { getOrderForUser } from "@/lib/account";
import { sendEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";
import { STORE } from "@/lib/delivery-config";
import { formatPKR, formatDate } from "@/lib/format";
import { reasonLabel, MAX_RETURN_NOTE } from "@/lib/return-reasons";

type Result = { ok: true } | { ok: false; error: string };

const escapeHtml = (s: string) =>
  s.replace(/[&<>]/g, (c) => (c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;"));

/**
 * Send a "report a problem" request for an order to the store inbox.
 *
 * This is a contact form, not a persisted return workflow: Nova's schema has no
 * customer return-request entity and the store has no fulfilment path, so we
 * email the details to STORE.email and persist nothing (no schema changes, no
 * fabricated record). The order and user are re-loaded server-side — the client
 * only supplies the order id, reason, and note.
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

  // In dev without a Resend key, sendEmail only logs to/subject; print the full
  // body too so the request is inspectable (same "log instead of send" idea).
  if (!env.RESEND_API_KEY) {
    console.log(`\n📨  [dev] return request for ${order.number}\n${body}\n`);
  }

  try {
    await sendEmail({
      to: STORE.email,
      subject: `Return request: ${order.number}`,
      html: `<pre style="font:14px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;color:#1f2b2a;">${escapeHtml(
        body,
      )}</pre>`,
    });
    logger.info({ orderId: order.id, orderNumber: order.number, to: STORE.email }, "return_request");
    return { ok: true };
  } catch (e) {
    logger.error({ err: e, orderId: order.id }, "return_request_failed");
    return { ok: false, error: "Something went wrong sending your request. Please try again." };
  }
}
