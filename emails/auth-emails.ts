/**
 * Transactional auth email templates — HTML mirrors the design in Auth.dc.html
 * (deep-gradient header, single CTA, copyable fallback link, expiry note,
 * "ignore if you didn't request" safety copy).
 */

type Email = { subject: string; html: string };

const BRAND = "Nova";
const ADDRESS = "Nova, Inc. · 100 Market St, San Francisco, CA";

function shell(inner: string): string {
  return `
  <div style="background:#f2f4f4;padding:28px 0;font-family:'IBM Plex Sans',system-ui,sans-serif;">
    <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(40,60,60,.08);">
      <div style="background:linear-gradient(155deg,#274b4f 0%,#1c3a40 100%);padding:26px 32px;">
        <span style="font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:22px;color:#fff;letter-spacing:-.02em;">${BRAND}</span>
      </div>
      <div style="padding:34px 32px;color:#33403f;">${inner}</div>
      <div style="padding:20px 32px;border-top:1px solid #eef1f1;text-align:center;font-size:12px;color:#8a9a99;line-height:1.6;">
        ${ADDRESS}<br>This is a transactional message about your account.
      </div>
    </div>
  </div>`;
}

function body(opts: {
  heading: string;
  intro: string;
  cta: string;
  url: string;
  expiry: string;
}): string {
  return shell(`
    <h2 style="font-family:'Bricolage Grotesque',sans-serif;font-weight:700;font-size:22px;letter-spacing:-.02em;margin:0 0 14px;color:#1f2b2a;">${opts.heading}</h2>
    <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#4a5654;">${opts.intro}</p>
    <a href="${opts.url}" style="display:inline-block;background:#3f7e82;color:#fff;text-decoration:none;padding:14px 30px;border-radius:10px;font-size:15px;font-weight:700;">${opts.cta}</a>
    <p style="margin:26px 0 8px;color:#69736f;font-size:13px;line-height:1.6;">Or paste this link into your browser:</p>
    <div style="font-family:'IBM Plex Mono',monospace;font-size:12px;color:#2f5f63;word-break:break-all;background:#f7f9f9;border:1px solid #e9eeee;border-radius:8px;padding:10px 12px;">${opts.url}</div>
    <div style="margin-top:22px;padding:12px 14px;background:#fbf6ea;border:1px solid #efe0bd;border-radius:9px;font-size:13px;color:#7a6636;line-height:1.5;">${opts.expiry}</div>
    <p style="margin:22px 0 0;color:#8a9a99;font-size:13px;line-height:1.6;">If you didn't request this, you can safely ignore this email — no changes will be made.</p>
  `);
}

export function verifyEmail(name: string, url: string): Email {
  return {
    subject: "Verify your email to activate your account",
    html: body({
      heading: "Confirm your email address",
      intro: `Welcome to ${BRAND}${name ? `, ${name}` : ""}! Confirm this is your email address to finish setting up your account and start shopping.`,
      cta: "Verify email address",
      url,
      expiry: "This verification link expires in 24 hours and can be used once.",
    }),
  };
}

export function inviteEmail(
  name: string,
  url: string,
  roleLabel: string,
): Email {
  return {
    subject: `You've been invited to the ${BRAND} team`,
    html: body({
      heading: "You've been added to the team",
      intro: `${name ? `Hi ${name} — ` : ""}an administrator has invited you to ${BRAND} as <strong>${roleLabel}</strong>. Set your password to activate your account and access the admin dashboard.`,
      cta: "Set your password",
      url,
      expiry: "This invitation link expires in 7 days and can be used once.",
    }),
  };
}

export function resetEmail(url: string): Email {
  return {
    subject: "Reset your password",
    html: body({
      heading: "Reset your password",
      intro:
        "We received a request to reset the password for your account. Click the button below to choose a new one.",
      cta: "Reset password",
      url,
      expiry:
        "This reset link expires in 60 minutes and can be used once. Requesting another link invalidates this one.",
    }),
  };
}
