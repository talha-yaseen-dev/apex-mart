/**
 * Static SEO metadata + banner copy per category (no merchandising CMS yet).
 * Falls back to a generic template for any slug not listed here.
 */
export type CategoryMeta = {
  title: string;
  description: string;
  tagline: string;
};

export const CATEGORY_META: Record<string, CategoryMeta> = {
  grocery: {
    title: "Grocery",
    description:
      "Rice, atta, cooking oil, daal, sugar, tea and everyday pantry staples — delivered across the city. PKR prices, cash on delivery.",
    tagline: "Pantry staples & daily essentials",
  },
  beverages: {
    title: "Beverages",
    description:
      "Soft drinks, juices, squashes, water, tea and coffee at Mart Shop. Same-day delivery, cash on delivery.",
    tagline: "Drinks, juices, tea & coffee",
  },
  snacks: {
    title: "Snacks",
    description:
      "Chips, biscuits, chocolate, namkeen and everything to munch on — delivered fast. Cash on delivery.",
    tagline: "Chips, biscuits & chocolate",
  },
  household: {
    title: "Household",
    description:
      "Detergents, cleaners, dishwash, tissues and home essentials at everyday prices. Free delivery over Rs. 1,500.",
    tagline: "Cleaning & home essentials",
  },
  "personal-care": {
    title: "Personal Care",
    description:
      "Shampoo, soap, toothpaste, skincare and grooming essentials — delivered to your door. Cash on delivery.",
    tagline: "Bath, hair & grooming",
  },
  "baby-kids": {
    title: "Baby & Kids",
    description:
      "Diapers, wipes, baby food, baby care and kids' essentials at Mart Shop. Same-day delivery.",
    tagline: "Diapers, baby food & care",
  },
};

export function categoryMeta(slug: string, name: string): CategoryMeta {
  return (
    CATEGORY_META[slug] ?? {
      title: name,
      description: `Shop ${name} online at Mart Shop — PKR prices, cash on delivery, free delivery over Rs. 1,500.`,
      tagline: name,
    }
  );
}
