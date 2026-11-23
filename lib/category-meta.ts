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
  "bike-tyres": {
    title: "Bike Tyres",
    description: "Explore motorcycle and scooter tyres by size at Apex Tyres.",
    tagline: "Motorcycle and scooter tyres",
  },
  "car-tyres": {
    title: "Car Tyres",
    description: "Explore car and SUV tyres by size at Apex Tyres.",
    tagline: "Car and SUV tyres",
  },
  "truck-tyres": {
    title: "Truck Tyres",
    description: "Explore commercial and light truck tyres by size at Apex Tyres.",
    tagline: "Light truck and commercial tyres",
  },
};

export function categoryMeta(slug: string, name: string): CategoryMeta {
  return (
    CATEGORY_META[slug] ?? {
      title: name,
      description: `Shop ${name} online at Apex Tyres — PKR prices and cash on delivery.`,
      tagline: name,
    }
  );
}
