/**
 * Mart Shop grocery catalogue seed (PKR).
 *
 * Separate from the reused Nova prisma/seed.ts (which seeds users, roles,
 * permissions, and coupons — kept intact). This replaces ONLY the catalogue
 * (categories, products, variants, images, reviews) with a grocery set that
 * matches the Claude Design "Mart Shop" mockups: 6 aisles, PKR pricing, and
 * 2–3 pack-size variants per product. Pack size and per-unit price live in
 * variant.attributes (the schema is unchanged).
 *
 *   Run: npm run db:seed:mart   (loads .env, does not touch users/roles/coupons)
 *
 * Prices are whole rupees in the data; stored as paisa (×100) to keep the
 * platform's integer-minor-unit convention. Displayed via lib/format.formatPKR.
 */
import { PrismaClient, ProductStatus } from "@prisma/client";

const prisma = new PrismaClient();

type Variant = {
  pack: string; // e.g. "5kg" — becomes the PDP pack-size axis
  price: number; // whole rupees
  perN: number; // denominator for unit price
  perU: string; // unit label for unit price, e.g. "kg", "L", "pc"
  stock?: number; // default 40; 0 = out of stock (for the design's states)
};
type Prod = {
  name: string;
  brand: string | null;
  img: string;
  variants: Variant[];
};
type Aisle = { slug: string; name: string; products: Prod[] };

// Unsplash photo ids reused from the design mockup + a few close matches.
const U = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=600&h=600&fit=crop&auto=format`;

const CATALOGUE: Aisle[] = [
  {
    slug: "grocery",
    name: "Grocery",
    products: [
      { name: "Basmati Rice", brand: "Guard", img: U("1586201375761-83865001e31c"),
        variants: [ { pack: "1kg", price: 240, perN: 1, perU: "kg" }, { pack: "5kg", price: 1120, perN: 5, perU: "kg" }, { pack: "25kg", price: 5400, perN: 25, perU: "kg" } ] },
      { name: "Whole Wheat Atta", brand: "Sunridge", img: U("1627735483792-233bf632619b"),
        variants: [ { pack: "5kg", price: 640, perN: 5, perU: "kg" }, { pack: "10kg", price: 1200, perN: 10, perU: "kg" } ] },
      { name: "Sufi Cooking Oil", brand: "Sufi", img: U("1474979266404-7eaacbcd87c5"),
        variants: [ { pack: "1L", price: 580, perN: 1, perU: "L" }, { pack: "5L", price: 2750, perN: 5, perU: "L", stock: 0 } ] },
      { name: "Refined Sugar", brand: "National", img: U("1581441363689-1f3c3c414635"),
        variants: [ { pack: "1kg", price: 150, perN: 1, perU: "kg" }, { pack: "5kg", price: 720, perN: 5, perU: "kg" } ] },
      { name: "Daal Mash", brand: "National", img: U("1596797038530-2c107229654b"),
        variants: [ { pack: "500g", price: 190, perN: 0.5, perU: "kg" }, { pack: "1kg", price: 360, perN: 1, perU: "kg" } ] },
      { name: "Daal Chana", brand: "National", img: U("1515543237350-b3eea1ec8082"),
        variants: [ { pack: "500g", price: 130, perN: 0.5, perU: "kg" }, { pack: "1kg", price: 250, perN: 1, perU: "kg" } ] },
      { name: "Nido Milk Powder", brand: "Nestlé", img: U("1563636619-e9143da7973b"),
        variants: [ { pack: "400g", price: 850, perN: 0.4, perU: "kg" }, { pack: "900g", price: 1850, perN: 0.9, perU: "kg" } ] },
      { name: "Tapal Danedar Tea", brand: "Tapal", img: U("1597318181409-cf64d0b5d8a2"),
        variants: [ { pack: "475g", price: 720, perN: 0.475, perU: "kg" }, { pack: "950g", price: 1390, perN: 0.95, perU: "kg" } ] },
    ],
  },
  {
    slug: "beverages",
    name: "Beverages",
    products: [
      { name: "Coca-Cola", brand: "Coca-Cola", img: U("1554866585-cd94860890b7"),
        variants: [ { pack: "1.5L", price: 190, perN: 1.5, perU: "L" }, { pack: "2.25L", price: 260, perN: 2.25, perU: "L" } ] },
      { name: "Sprite", brand: "Coca-Cola", img: U("1625772299848-391b6a87d7b3"),
        variants: [ { pack: "1.5L", price: 190, perN: 1.5, perU: "L" }, { pack: "500ml", price: 80, perN: 0.5, perU: "L" } ] },
      { name: "Rooh Afza", brand: "Hamdard", img: U("1498429089284-41f8cf3ffd39"),
        variants: [ { pack: "800ml", price: 380, perN: 0.8, perU: "L" }, { pack: "1.5L", price: 690, perN: 1.5, perU: "L" } ] },
      { name: "Nestlé Pure Life Water", brand: "Nestlé", img: U("1581636625402-29b2a704ef13"),
        variants: [ { pack: "1.5L", price: 90, perN: 1.5, perU: "L" }, { pack: "6×500ml", price: 250, perN: 3, perU: "L" } ] },
      { name: "Tang Orange", brand: "Tang", img: U("1600271886742-f049cd451bba"),
        variants: [ { pack: "375g", price: 150, perN: 0.375, perU: "kg" }, { pack: "750g", price: 280, perN: 0.75, perU: "kg" } ] },
      { name: "Nescafé Classic", brand: "Nestlé", img: U("1511920170033-f8396924c348"),
        variants: [ { pack: "50g", price: 620, perN: 0.05, perU: "kg" }, { pack: "100g", price: 1150, perN: 0.1, perU: "kg" } ] },
      { name: "Lipton Yellow Label Tea", brand: "Lipton", img: U("1544787219-7f47ccb76574"),
        variants: [ { pack: "170g", price: 320, perN: 0.17, perU: "kg" }, { pack: "430g", price: 720, perN: 0.43, perU: "kg" } ] },
    ],
  },
  {
    slug: "snacks",
    name: "Snacks",
    products: [
      { name: "Lays Masala", brand: "Lays", img: U("1566478989037-eec170784d0b"),
        variants: [ { pack: "40g", price: 50, perN: 0.04, perU: "kg" }, { pack: "100g", price: 100, perN: 0.1, perU: "kg" } ] },
      { name: "Kurkure Chutney Chaska", brand: "Kurkure", img: U("1613919113640-25732ec5e61f"),
        variants: [ { pack: "38g", price: 30, perN: 0.038, perU: "kg" }, { pack: "80g", price: 60, perN: 0.08, perU: "kg" } ] },
      { name: "Sooper Biscuits", brand: "EBM", img: U("1558961363-fa8fdf82db35"),
        variants: [ { pack: "Single", price: 45, perN: 1, perU: "pack" }, { pack: "Family", price: 160, perN: 4, perU: "pack" } ] },
      { name: "Prince Chocolate Biscuits", brand: "LU", img: U("1558961363-fa8fdf82db35"),
        variants: [ { pack: "Half Roll", price: 60, perN: 1, perU: "pack" }, { pack: "Full Roll", price: 110, perN: 2, perU: "pack" } ] },
      { name: "Dairy Milk Chocolate", brand: "Cadbury", img: U("1548907040-4baa42d10919"),
        variants: [ { pack: "38g", price: 150, perN: 0.038, perU: "kg" }, { pack: "95g", price: 350, perN: 0.095, perU: "kg" } ] },
      { name: "Salted Peanuts", brand: "Mitchell's", img: U("1567892737950-30c4db37cd89"),
        variants: [ { pack: "200g", price: 220, perN: 0.2, perU: "kg" }, { pack: "500g", price: 500, perN: 0.5, perU: "kg" } ] },
      { name: "Slanty Salted", brand: "Slanty", img: U("1566478989037-eec170784d0b"),
        variants: [ { pack: "25g", price: 20, perN: 0.025, perU: "kg" }, { pack: "60g", price: 40, perN: 0.06, perU: "kg" } ] },
    ],
  },
  {
    slug: "household",
    name: "Household",
    products: [
      { name: "Surf Excel Washing Powder", brand: "Surf Excel", img: U("1563453392212-326f5e854473"),
        variants: [ { pack: "500g", price: 260, perN: 0.5, perU: "kg" }, { pack: "1kg", price: 450, perN: 1, perU: "kg" } ] },
      { name: "Harpic Toilet Cleaner", brand: "Harpic", img: U("1649005011845-ef225c89da86"),
        variants: [ { pack: "500ml", price: 280, perN: 0.5, perU: "L" }, { pack: "1L", price: 520, perN: 1, perU: "L" } ] },
      { name: "Vim Dishwash Liquid", brand: "Vim", img: U("1585421514738-01798e348b17"),
        variants: [ { pack: "500ml", price: 240, perN: 0.5, perU: "L" }, { pack: "750ml", price: 340, perN: 0.75, perU: "L" } ] },
      { name: "Max Facial Tissues", brand: "Rose Petal", img: U("1583947215259-38e31be8751f"),
        variants: [ { pack: "100 sheets", price: 160, perN: 100, perU: "sheet" }, { pack: "200 sheets", price: 300, perN: 200, perU: "sheet" } ] },
      { name: "Garbage Bags", brand: "Homeware", img: U("1610557892470-55d9e80c0bce"),
        variants: [ { pack: "Medium 30s", price: 190, perN: 30, perU: "bag" }, { pack: "Large 30s", price: 280, perN: 30, perU: "bag" } ] },
      { name: "Mortein Insect Killer", brand: "Mortein", img: U("1626806787461-102c1bfaaea1"),
        variants: [ { pack: "300ml", price: 480, perN: 0.3, perU: "L" }, { pack: "600ml", price: 850, perN: 0.6, perU: "L", stock: 0 } ] },
    ],
  },
  {
    slug: "personal-care",
    name: "Personal Care",
    products: [
      { name: "Head & Shoulders Shampoo", brand: "Head & Shoulders", img: U("1585751119414-ef2636f8aede"),
        variants: [ { pack: "185ml", price: 380, perN: 0.185, perU: "L" }, { pack: "360ml", price: 620, perN: 0.36, perU: "L" } ] },
      { name: "Sunsilk Shampoo", brand: "Sunsilk", img: U("1585751119414-ef2636f8aede"),
        variants: [ { pack: "185ml", price: 320, perN: 0.185, perU: "L" }, { pack: "360ml", price: 560, perN: 0.36, perU: "L" } ] },
      { name: "Colgate Triple Action", brand: "Colgate", img: U("1624372635277-283042097f31"),
        variants: [ { pack: "75ml", price: 160, perN: 0.075, perU: "L" }, { pack: "150ml", price: 280, perN: 0.15, perU: "L" } ] },
      { name: "Lifebuoy Soap", brand: "Lifebuoy", img: U("1600857544200-b2f666a9a2ec"),
        variants: [ { pack: "Single", price: 90, perN: 1, perU: "bar" }, { pack: "Pack of 3", price: 250, perN: 3, perU: "bar" } ] },
      { name: "Dettol Antiseptic", brand: "Dettol", img: U("1584362917165-526a968579e8"),
        variants: [ { pack: "250ml", price: 350, perN: 0.25, perU: "L" }, { pack: "500ml", price: 620, perN: 0.5, perU: "L" } ] },
      { name: "Gillette Razor", brand: "Gillette", img: U("1621607512214-68297480165e"),
        variants: [ { pack: "Single", price: 220, perN: 1, perU: "pc" }, { pack: "Pack of 5", price: 950, perN: 5, perU: "pc" } ] },
    ],
  },
  {
    slug: "baby-kids",
    name: "Baby & Kids",
    products: [
      { name: "Pampers Diapers Small", brand: "Pampers", img: U("1515488042361-ee00e0ddd4e4"),
        variants: [ { pack: "30 pcs", price: 1150, perN: 30, perU: "pc" }, { pack: "60 pcs", price: 2100, perN: 60, perU: "pc" } ] },
      { name: "Canbebe Baby Wipes", brand: "Canbebe", img: U("1607083206968-13611e3d76db"),
        variants: [ { pack: "56 wipes", price: 260, perN: 56, perU: "wipe" }, { pack: "120 wipes", price: 480, perN: 120, perU: "wipe" } ] },
      { name: "Cerelac Wheat", brand: "Nestlé", img: U("1490474418585-ba9bad8fd0ea"),
        variants: [ { pack: "175g", price: 420, perN: 0.175, perU: "kg" }, { pack: "350g", price: 780, perN: 0.35, perU: "kg" } ] },
      { name: "Johnson's Baby Oil", brand: "Johnson's", img: U("1596462502278-27bfdc403348"),
        variants: [ { pack: "100ml", price: 340, perN: 0.1, perU: "L" }, { pack: "200ml", price: 590, perN: 0.2, perU: "L" } ] },
      { name: "Johnson's Baby Soap", brand: "Johnson's", img: U("1600857544200-b2f666a9a2ec"),
        variants: [ { pack: "Single", price: 150, perN: 1, perU: "bar" }, { pack: "Pack of 3", price: 420, perN: 3, perU: "bar" } ] },
      { name: "Nan Pro Formula", brand: "Nestlé", img: U("1584515933487-779824d29309"),
        variants: [ { pack: "400g", price: 2100, perN: 0.4, perU: "kg" }, { pack: "800g", price: 3950, perN: 0.8, perU: "kg", stock: 0 } ] },
    ],
  },
];

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const unitPrice = (v: Variant) =>
  `Rs. ${Math.round(v.price / v.perN).toLocaleString("en-PK")}/${v.perU}`;

async function wipeCatalogue() {
  // Delete catalogue-owned rows in FK-safe order. Users, roles, permissions,
  // and coupons (from prisma/seed.ts) are intentionally left untouched.
  await prisma.stockReservation.deleteMany();
  await prisma.inventoryLog.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.review.deleteMany();
  await prisma.wishlist.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
}

async function main() {
  console.log("🛒  Seeding Mart Shop grocery catalogue (PKR)…");
  await wipeCatalogue();

  let nProducts = 0;
  let nVariants = 0;
  let nImages = 0;

  for (const aisle of CATALOGUE) {
    const category = await prisma.category.create({
      data: { name: aisle.name, slug: aisle.slug },
    });

    for (const p of aisle.products) {
      const slug = slugify(p.name);
      const skuBase = slug.toUpperCase();
      const product = await prisma.product.create({
        data: {
          name: p.name,
          brand: p.brand,
          slug,
          status: ProductStatus.ACTIVE,
          categoryId: category.id,
          images: {
            create: [{ url: p.img, alt: p.name, position: 0 }],
          },
          variants: {
            create: p.variants.map((v) => ({
              sku: `${skuBase}-${slugify(v.pack).toUpperCase()}`,
              priceMinor: v.price * 100, // rupees → paisa
              currency: "PKR",
              stock: v.stock ?? 40,
              attributes: { pack: v.pack, unitPrice: unitPrice(v) },
            })),
          },
        },
      });
      nProducts += 1;
      nVariants += p.variants.length;
      nImages += 1;
      void product;
    }
  }

  const [categories, products, variants, images] = await Promise.all([
    prisma.category.count(),
    prisma.product.count(),
    prisma.productVariant.count(),
    prisma.productImage.count(),
  ]);

  console.log("✅  Grocery catalogue seeded:", {
    categories,
    products,
    variants,
    images,
    seededProducts: nProducts,
    seededVariants: nVariants,
    seededImages: nImages,
  });
}

main()
  .catch((e) => {
    console.error("❌  Mart seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
