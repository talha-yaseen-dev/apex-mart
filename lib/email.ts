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
  await resend.emails.send({
    from: env.EMAIL_FROM,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
}
