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

const pickupTopic: HelpTopic = {
  slug: "pickup",
  icon: "🏬",
  title: "Store pickup",
  preview: "Collect your order from the store.",
  metaTitle: "Store pickup",
  metaDescription: "How store pickup works at Mart Shop.",
  sections: [
    {
      id: "is-pickup-available",
      heading: "Is pickup available?",
      blocks: [
        {
          todo: "Confirm whether store pickup is actually offered. If it is not, this page should be hidden rather than published.",
        },
      ],
    },
    {
      id: "how-to-pick-up",
      heading: "How to pick up",
      blocks: [{ todo: "Explain the pickup process — where to go, what to show, and timing after ordering." }],
    },
    {
      id: "pickup-hours",
      heading: "Pickup hours",
      blocks: [{ todo: "Confirm pickup hours (these may differ from store opening hours)." }],
    },
    {
      id: "bring-your-order-ref",
      heading: "Bring your order reference",
      blocks: [{ todo: "Confirm what the customer needs to bring — order reference, phone number, ID." }],
    },
  ],
};

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
      id: "ordering",
      group: "Ordering",
      items: [
        { q: "How do I place an order?", a: null },
        { q: "Do I need an account to order?", a: null },
        { q: "Can I change or cancel my order after placing it?", a: null },
      ],
    },
    {
      id: "payment",
      group: "Payment",
      items: [
        { q: "What payment methods do you accept?", a: null },
        { q: "Is Cash on Delivery available?", a: null },
        { q: "When do I pay for my order?", a: null },
      ],
    },
    {
      id: "delivery",
      group: "Delivery",
      items: [
        { q: "Which areas do you deliver to?", a: null },
        { q: "How much does delivery cost?", a: null },
        { q: "How long does delivery take?", a: null },
      ],
    },
    {
      id: "account",
      group: "Account",
      items: [
        { q: "How do I create an account?", a: null },
        { q: "How do I track my order?", a: null },
        { q: "How do I reset my password?", a: null },
      ],
    },
  ],
};

export const HELP_TOPICS: HelpTopic[] = [deliveryTopic, pickupTopic, returnsTopic, faqTopic];

export const helpTopic = (slug: string): HelpTopic | undefined =>
  HELP_TOPICS.find((t) => t.slug === slug);
