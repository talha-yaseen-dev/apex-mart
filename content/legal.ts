/**
 * Legal document templates for Apex Tyres.
 *
 * These are SCAFFOLDS, not policies. Every section body is a TODO marker — no
 * real policy text, effective dates, company legal name, jurisdiction, data
 * retention periods, or refund windows are invented here. The headings are
 * sensible starting points; the client's own counsel supplies the wording.
 *
 * A body that still starts with "TODO:" renders as an amber callout on the page;
 * replace it with the real copy (plain paragraphs, blank line between them) and
 * the callout becomes normal prose automatically.
 */

export type LegalSection = {
  heading: string;
  body: string;
};

export type LegalDoc = {
  slug: string;
  title: string;
  /** Short, static meta description — describes the doc, asserts no policy. */
  description: string;
  /**
   * Effective / last-updated date. Null until the client publishes real copy —
   * the page shows an amber "date not set" flag while it's null.
   * TODO([Client]): set this (e.g. "1 January 2026") when the policy goes live.
   */
  updatedAt: string | null;
  sections: LegalSection[];
};

/** Standard placeholder body — the client replaces each with real policy text. */
const TODO = "TODO: [Client] must supply the actual policy for this section.";
const s = (heading: string): LegalSection => ({ heading, body: TODO });

export const LEGAL_DOCS: Record<string, LegalDoc> = {
  privacy: {
    slug: "privacy",
    title: "Apex Tyres Privacy Policy",
    description:
      "How Apex Tyres collects, uses, and protects your personal information.",
    updatedAt: null,
    sections: [
      s("What we collect"),
      s("How we use it"),
      s("Cookies & tracking"),
      s("Sharing & third parties"),
      s("Data retention"),
      s("Your rights"),
      s("Contact us"),
    ],
  },
  terms: {
    slug: "terms",
    title: "Apex Tyres Terms of Service",
    description: "The terms that govern your use of Apex Tyres.",
    updatedAt: null,
    sections: [
      s("Acceptance of these terms"),
      s("Using Apex Tyres"),
      s("Orders & pricing"),
      s("Payment"),
      s("Delivery"),
      s("Cancellations & returns"),
      s("Limitation of liability"),
      s("Changes to these terms"),
      s("Contact us"),
    ],
  },
  returns: {
    slug: "returns",
    title: "Apex Tyres Returns & Refund Policy",
    description: "How returns and refunds work at Apex Tyres.",
    updatedAt: null,
    sections: [
      s("Return eligibility"),
      s("How to return an item"),
      s("Refunds"),
      s("Damaged or incorrect items"),
      s("Non-returnable items"),
      s("Contact us"),
    ],
  },
  shipping: {
    slug: "shipping",
    title: "Apex Tyres Shipping Policy",
    description: "Delivery areas, times, and fees for Apex Tyres orders.",
    updatedAt: null,
    sections: [
      s("Delivery areas"),
      s("Delivery times"),
      s("Delivery fees"),
      s("Order tracking"),
      s("Failed or missed deliveries"),
      s("Contact us"),
    ],
  },
  cookies: {
    slug: "cookies",
    title: "Apex Tyres Cookie Policy",
    description: "How Apex Tyres uses cookies and similar technologies.",
    updatedAt: null,
    sections: [
      s("What cookies are"),
      s("Cookies we use"),
      s("Managing your cookies"),
      s("Third-party cookies"),
      s("Changes to this policy"),
      s("Contact us"),
    ],
  },
};

/** Slugs in display order — used by generateStaticParams and the site footer. */
export const LEGAL_SLUGS = Object.keys(LEGAL_DOCS);

export function getLegalDoc(slug: string): LegalDoc | null {
  return LEGAL_DOCS[slug] ?? null;
}

/** True while a section body is still a placeholder (renders as an amber TODO). */
export function isTodoBody(body: string): boolean {
  return body.trimStart().startsWith("TODO:");
}
