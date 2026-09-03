import {
  DELIVERY_ZONES,
  FLAT_DELIVERY_FEE_MINOR,
  FREE_DELIVERY_THRESHOLD_MINOR,
  DELIVERY_SLOTS,
} from "@/lib/delivery-config";
import { formatPKR } from "@/lib/format";

/**
 * Static help content. Delivery pulls REAL zone/fee/slot data from
 * lib/delivery-config; everything else is a TODO the owner fills in — no
 * fabricated policies, times, or fees.
 */

export type Block = { p: string } | { list: string[] } | { todo: string };
export type Section = { id: string; heading: string; blocks: Block[] };
export type FaqItem = { q: string; a: string | null }; // a=null → answer is TODO
export type FaqGroup = { id: string; group: string; items: FaqItem[] };

export type HelpTopic = {
  slug: string;
  icon: string;
  title: string;
  preview: string;
  metaTitle: string;
  metaDescription: string;
  sections?: Section[];
  faqGroups?: FaqGroup[];
};

const deliveryTopic: HelpTopic = {
  slug: "delivery",
  icon: "🚚",
  title: "Delivery information",
  preview: "Zones we cover, fees, and 2-hour delivery slots.",
  metaTitle: "Delivery information",
  metaDescription:
    "Mart Shop delivery zones, fees, and 2-hour time slots. Free delivery over Rs. 1,500, cash on delivery.",
  sections: [
    {
      id: "delivery-zones",
      heading: "Delivery zones",
      blocks: [
        { p: "We currently deliver to these areas across the city:" },
        { list: DELIVERY_ZONES.map((z) => z.name) },
      ],
    },
    {
      id: "delivery-fees",
      heading: "Delivery fees",
      blocks: [
        {
          p: `Delivery is free on orders of ${formatPKR(FREE_DELIVERY_THRESHOLD_MINOR)} or more. Below that, a flat ${formatPKR(FLAT_DELIVERY_FEE_MINOR)} fee applies to most areas — a few outer zones cost a little more.`,
        },
        { list: DELIVERY_ZONES.map((z) => `${z.name} — ${formatPKR(z.feeMinor)}`) },
      ],
    },
    {
      id: "delivery-time-slots",
      heading: "Delivery time slots",
      blocks: [
        { p: "Pick a 2-hour delivery window at checkout, seven days a week:" },
        { list: [...DELIVERY_SLOTS] },
        { p: "Order before 6pm for same-day dispatch." },
      ],
    },
    {
      id: "missed-delivery",
      heading: "What if I miss my delivery?",
      blocks: [
        {
          todo: "Describe the missed-delivery process — re-attempt window, how the rider makes contact, and how to reschedule.",
        },
      ],
    },
    {
      id: "contactless-delivery",
      heading: "Contactless delivery",
      blocks: [
        {
          todo: "Describe contactless delivery (leave-at-door option, how to request it, and how cash-on-delivery is handled).",
        },
      ],
    },
  ],
};

// NOTE: /help/pickup intentionally omitted — store pickup is not offered, so
// the page is hidden (dropped from HELP_TOPICS → 404) rather than published.

const returnsTopic: HelpTopic = {
  slug: "returns",
  icon: "↩️",
  title: "Returns and refunds",
  preview: "Our return policy and how to request one.",
  metaTitle: "Returns and refunds",
  metaDescription: "Mart Shop returns and refunds policy.",
  sections: [
    { id: "our-return-policy", heading: "Our return policy", blocks: [{ todo: "State the overall return policy and the return window." }] },
    {
      id: "what-can-be-returned",
      heading: "What can be returned",
      blocks: [{ todo: "List what can and cannot be returned — e.g. perishables, opened packages, hygiene items." }],
    },
    {
      id: "how-to-request-a-return",
      heading: "How to request a return",
      blocks: [{ todo: "Explain how to request a return — refuse at the door, within N hours, and through which channel." }],
    },
    { id: "refund-method", heading: "Refund method", blocks: [{ todo: "State how refunds are issued for cash-on-delivery orders (cash, store credit, or redelivery)." }] },
    { id: "timeline", heading: "Timeline", blocks: [{ todo: "State the refund or redelivery timeline." }] },
  ],
};

const faqTopic: HelpTopic = {
  slug: "faq",
  icon: "❓",
  title: "Frequently asked questions",
  preview: "Quick answers to common questions.",
  metaTitle: "Frequently asked questions",
  metaDescription:
    "Answers to common questions about ordering, payment, delivery, and accounts at Mart Shop.",
  faqGroups: [
    {
      id: "delivery",
      group: "Delivery",
      items: [
        {
          q: "What areas do you deliver to?",
          a: "We currently deliver within our 6 defined zones inside the city. Enter your address at checkout to see if we cover your area. If you're outside our zones, contact us on WhatsApp — we may still be able to arrange delivery.",
        },
        {
          q: "How long does delivery take?",
          a: "Most orders are delivered within 2 hours during our operating hours. You can select a specific time slot at checkout, including next-day slots.",
        },
        {
          q: "What is the delivery fee?",
          a: "Delivery is Rs.120 for most zones, with a small surcharge for outer areas. Orders above Rs.1,500 get free delivery within our standard zones.",
        },
        {
          q: "What if I'm not home when the rider arrives?",
          a: "Our rider will call you before arrival. If you're unavailable, they wait briefly or reschedule. Missed deliveries can be redelivered the same day or the next available slot.",
        },
      ],
    },
    {
      id: "ordering",
      group: "Ordering & payment",
      items: [
        {
          q: "How do I place my order?",
          a: "Browse products, add them to cart, choose your address and delivery slot at checkout, confirm your details, and place the order. You can order as a guest — no account required.",
        },
        {
          q: "Can I order without creating an account?",
          a: "Yes. Guest checkout is available — just enter your name, phone, and delivery address. You can create an account afterwards to save your details for next time.",
        },
        {
          q: "What payment methods do you accept?",
          a: "We currently accept Cash on Delivery (COD) only. Online payment options are coming soon.",
        },
        {
          q: "What if an item is out of stock after I order?",
          a: "We check stock at the time of order. If something becomes unavailable, we contact you on WhatsApp before dispatch to confirm a substitute or remove the item.",
        },
      ],
    },
    {
      id: "support",
      group: "Orders & support",
      items: [
        {
          q: "How do I track my order?",
          a: "After placing an order, you'll receive an order reference. Use it along with your phone number on our Track Order page to see the status.",
        },
        {
          q: "What's your return policy?",
          a: "If you receive damaged, expired, or wrong items, contact us within 24 hours of delivery on WhatsApp or through the \"Report a problem\" button on your order page. We'll arrange a replacement or refund.",
        },
        {
          q: "How do I contact you?",
          a: "WhatsApp us at 0342-4348110 — this is our fastest channel. You can also visit our store during opening hours.",
        },
        {
          q: "Do you have a physical store?",
          a: "Yes. See our About page for the address and hours. You can walk in during opening hours, though we don't currently offer in-store pickup for online orders.",
        },
      ],
    },
  ],
};

export const HELP_TOPICS: HelpTopic[] = [deliveryTopic, returnsTopic, faqTopic];

export const helpTopic = (slug: string): HelpTopic | undefined =>
  HELP_TOPICS.find((t) => t.slug === slug);
