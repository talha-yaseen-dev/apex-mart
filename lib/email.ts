import "server-only";
import { Resend } from "resend";
import { env } from "@/lib/env";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

/**
 * Send a transactional email via Resend. Without an API key (local dev) the
 * message is logged instead of sent, so flows remain testable offline.
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  if (!resend) {
    console.log(
      `\n📧  [dev] email → ${opts.to}\n    subject: ${opts.subject}\n    (set RESEND_API_KEY to actually send)\n`,
    );
    return;
  }
  const from = env.EMAIL_FROM;
  if (!from) {
    // Misconfiguration: Resend is enabled but no verified sender is set. Fail
    // safe — log a controlled server-side error and skip the send. We never
    // fall back to an unverified sender, never throw into the caller (so
    // storefront/checkout/auth flows don't crash), and never surface details
    // to the user. Set EMAIL_FROM to a Resend-verified address to enable email.
    console.error(
      "[email] RESEND_API_KEY is set but EMAIL_FROM is missing — skipping send. " +
        "Configure EMAIL_FROM as a Resend-verified sender.",
    );
    return;
  }
  await resend.emails.send({
    from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
}
