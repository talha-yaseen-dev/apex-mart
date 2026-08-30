import { formatMoney } from "@/lib/utils";

/**
 * Order-lifecycle transactional emails — HTML mirrors the templates in
 * Hardening.dc.html (Nova gradient header, accent bar, meta box, single CTA).
 */
type Email = { subject: string; html: string };
type Line = { label: string; value: string };

const APP = process.env.APP_URL ?? "http://localhost:3000";

function template(opts: {
  accent: string;
  icon: string;
  heading: string;
  body: string;
  metaLabel: string;
  metaValue: string;
  lines: Line[];
  cta: string;
  ctaHref: string;
  footer: string;
}): string {
  return `
  <div style="background:#f2f4f4;padding:26px 0;font-family:'IBM Plex Sans',system-ui,sans-serif;">
    <div style="max-width:460px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(40,60,60,.08);">
      <div style="background:linear-gradient(155deg,#274b4f,#1c3a40);padding:22px 30px;">
        <span style="font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:20px;color:#fff;letter-spacing:-.02em;">Nova</span>
      </div>
      <div style="height:4px;background:${opts.accent};"></div>
      <div style="padding:30px;color:#33403f;">
        <div style="width:46px;height:46px;border-radius:12px;background:${opts.accent}22;color:${opts.accent};display:grid;place-items:center;font-size:22px;margin-bottom:16px;">${opts.icon}</div>
        <h2 style="font-family:'Bricolage Grotesque',sans-serif;font-weight:700;font-size:21px;letter-spacing:-.02em;margin:0 0 12px;color:#1f2b2a;">${opts.heading}</h2>
        <p style="margin:0 0 18px;color:#4a5654;font-size:14.5px;line-height:1.6;">${opts.body}</p>
        <div style="background:#f7f9f9;border:1px solid #e9eeee;border-radius:10px;padding:14px 16px;margin-bottom:20px;">
          <div style="display:flex;justify-content:space-between;font-size:12px;color:#69736f;margin-bottom:8px;"><span>${opts.metaLabel}</span><span style="font-family:'IBM Plex Mono',monospace;font-weight:600;color:#2b3534;">${opts.metaValue}</span></div>
          ${opts.lines
            .map(
              (l) =>
                `<div style="display:flex;justify-content:space-between;font-size:13px;padding:4px 0;border-top:1px solid #eef1f1;"><span style="color:#4a5654;">${l.label}</span><span style="font-weight:600;">${l.value}</span></div>`,
            )
            .join("")}
        </div>
        <a href="${opts.ctaHref}" style="display:inline-block;background:${opts.accent};color:#fff;text-decoration:none;padding:13px 28px;border-radius:10px;font-size:14.5px;font-weight:700;">${opts.cta}</a>
        <p style="margin:22px 0 0;color:#8a9a99;font-size:12.5px;line-height:1.6;">${opts.footer}</p>
      </div>
      <div style="padding:18px 30px;border-top:1px solid #eef1f1;text-align:center;font-size:11.5px;color:#8a9a99;line-height:1.6;">Nova, Inc. · 100 Market St, San Francisco, CA<br>Transactional message about your order.</div>
    </div>
  </div>`;
}

export function orderConfirmedEmail(o: {
  name: string;
  orderNumber: string;
  lines: Line[];
  totalMinor: number;
}): Email {
  return {
    subject: `Your Nova order is confirmed — ${o.orderNumber}`,
    html: template({
      accent: "#3f7e82",
      icon: "✓",
      heading: "Order confirmed",
      body: `Thanks, ${o.name}! We've received your order and payment. We'll email you again the moment it ships.`,
      metaLabel: "Order number",
      metaValue: o.orderNumber,
      lines: [...o.lines, { label: "Total", value: formatMoney(o.totalMinor) }],
      cta: "View your order",
      ctaHref: `${APP}/account/orders`,
      footer: "Need help? Reply to this email or visit the Help Center.",
    }),
  };
}

export function orderShippedEmail(o: {
  orderNumber: string;
  carrier: string;
  tracking: string;
}): Email {
  return {
    subject: `Your order has shipped 📦 — ${o.orderNumber}`,
    html: template({
      accent: "#4f6fd0",
      icon: "📦",
      heading: "On its way!",
      body: "Good news — your order is out for delivery. Use the tracking number below to follow along.",
      metaLabel: "Tracking number",
      metaValue: o.tracking,
      lines: [{ label: "Carrier", value: o.carrier }],
      cta: "Track package",
      ctaHref: `${APP}/account/orders`,
      footer: "Delivery estimates can shift slightly with carrier volume.",
    }),
  };
}

export function orderRefundedEmail(o: {
  orderNumber: string;
  amountMinor: number;
}): Email {
  return {
    subject: `Your refund has been processed — ${o.orderNumber}`,
    html: template({
      accent: "#c0553f",
      icon: "↩",
      heading: "Refund processed",
      body: "We've issued a refund to your original payment method. It typically appears within 5–10 business days.",
      metaLabel: "Refund amount",
      metaValue: formatMoney(o.amountMinor),
      lines: [{ label: "Order", value: o.orderNumber }],
      cta: "View order",
      ctaHref: `${APP}/account/orders`,
      footer: "The timing depends on your bank; Nova has completed its part.",
    }),
  };
}
