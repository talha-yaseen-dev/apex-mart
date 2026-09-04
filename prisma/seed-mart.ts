/**
 * Apex Mart grocery catalogue seed (PKR) — 50 real Pakistani SKUs.
 *
 * Separate from the reused Nova prisma/seed.ts (which seeds users, roles,
 * permissions, and coupons — kept intact). This replaces ONLY the catalogue
 * (categories, products, variants, images, reviews) with the Apex Mart grocery
 * set: 6 aisles, PKR pricing, and 1–3 pack-size variants per product. Pack size
 * and per-unit price live in variant.attributes ({ packSize, unitPrice }); the
 * Prisma schema is unchanged.
 *
 *   Run: npm run db:seed:mart   (loads .env, does not touch users/roles/coupons)
 *
 * Prices are whole rupees in the data; stored as paisa (×100) to keep the
 * platform's integer-minor-unit convention. Displayed via lib/format.formatPKR.
 * Images reuse a pool of verified-working Unsplash photo ids (each checked 200)
 * mapped by category — real product photography is an owner task for later.
 */
import { PrismaClient, ProductStatus } from "@prisma/client";

const prisma = new PrismaClient();

type Variant = {
  pack: string; // e.g. "5kg" — becomes the PDP pack-size axis (attributes.packSize)
  price: number; // whole rupees
  perN: number; // denominator for unit price
  perU: string; // unit label for unit price, e.g. "kg", "L", "pc"
  stock?: number; // default 40; kept in the 20–50 range
};
type Prod = {
  name: string;
  brand: string | null;
  img: string;
  variants: Variant[];
};
type Aisle = { slug: string; name: string; products: Prod[] };

// Verified-working Unsplash photo ids (each returns 200), reused by category.
const U = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=600&h=600&fit=crop&auto=format`;
const IMG = {
  rice: U("1586201375761-83865001e31c"),
  staple: U("1627735483792-233bf632619b"),
  oil: U("1474979266404-7eaacbcd87c5"),
  sugar: U("1581441363689-1f3c3c414635"),
  daal: U("1596797038530-2c107229654b"),
  daal2: U("1515543237350-b3eea1ec8082"),
  dairyTin: U("1563636619-e9143da7973b"),
  tea1: U("1597318181409-cf64d0b5d8a2"),
  tea2: U("1544787219-7f47ccb76574"),
  cola: U("1554866585-cd94860890b7"),
  soda: U("1625772299848-391b6a87d7b3"),
  redBottle: U("1498429089284-41f8cf3ffd39"),
  water: U("1581636625402-29b2a704ef13"),
  powderDrink: U("1600271886742-f049cd451bba"),
  coffee: U("1511920170033-f8396924c348"),
  chips: U("1566478989037-eec170784d0b"),
  kurkure: U("1613919113640-25732ec5e61f"),
  biscuit: U("1558961363-fa8fdf82db35"),
  choc: U("1548907040-4baa42d10919"),
  detergent: U("1563453392212-326f5e854473"),
  cleaner: U("1649005011845-ef225c89da86"),
  liquidBottle: U("1585421514738-01798e348b17"),
  tissue: U("1583947215259-38e31be8751f"),
  shampoo: U("1585751119414-ef2636f8aede"),
  toothpaste: U("1624372635277-283042097f31"),
  soap: U("1600857544200-b2f666a9a2ec"),
  antiseptic: U("1584362917165-526a968579e8"),
  razor: U("1621607512214-68297480165e"),
  diaper: U("1515488042361-ee00e0ddd4e4"),
  wipes: U("1607083206968-13611e3d76db"),
  cereal: U("1490474418585-ba9bad8fd0ea"),
  babyCare: U("1596462502278-27bfdc403348"),
  formula: U("1584515933487-779824d29309"),
} as const;

const CATALOGUE: Aisle[] = [
  {
    slug: "grocery",
    name: "Grocery",
    products: [
      { name: "Sufi Basmati Rice", brand: "Sufi", img: IMG.rice,
        variants: [ { pack: "1kg", price: 360, perN: 1, perU: "kg", stock: 40 }, { pack: "5kg", price: 1700, perN: 5, perU: "kg", stock: 25 } ] },
      { name: "Kolson Spaghetti", brand: "Kolson", img: IMG.staple,
        variants: [ { pack: "400g", price: 140, perN: 0.4, perU: "kg", stock: 50 } ] },
      { name: "National Chana Daal", brand: "National", img: IMG.daal2,
        variants: [ { pack: "500g", price: 175, perN: 0.5, perU: "kg", stock: 45 }, { pack: "1kg", price: 340, perN: 1, perU: "kg", stock: 30 } ] },
      { name: "Shan Biryani Masala", brand: "Shan", img: IMG.daal,
        variants: [ { pack: "50g", price: 100, perN: 0.05, perU: "kg", stock: 50 } ] },
      { name: "Nestle Cerelac Wheat", brand: "Nestlé", img: IMG.cereal,
        variants: [ { pack: "175g", price: 560, perN: 0.175, perU: "kg", stock: 35 }, { pack: "350g", price: 1050, perN: 0.35, perU: "kg", stock: 25 } ] },
      { name: "Fauji Cornflakes", brand: "Fauji", img: IMG.cereal,
        variants: [ { pack: "250g", price: 400, perN: 0.25, perU: "kg", stock: 40 }, { pack: "500g", price: 750, perN: 0.5, perU: "kg", stock: 25 } ] },
      { name: "Rafhan Custard Vanilla", brand: "Rafhan", img: IMG.powderDrink,
        variants: [ { pack: "120g", price: 130, perN: 0.12, perU: "kg", stock: 45 }, { pack: "300g", price: 290, perN: 0.3, perU: "kg", stock: 30 } ] },
      { name: "Sooper Cooking Oil", brand: "Sooper", img: IMG.oil,
        variants: [ { pack: "1L", price: 620, perN: 1, perU: "L", stock: 40 }, { pack: "5L", price: 3000, perN: 5, perU: "L", stock: 20 } ] },
      { name: "Dalda Ghee", brand: "Dalda", img: IMG.oil,
        variants: [ { pack: "1kg", price: 780, perN: 1, perU: "kg", stock: 35 }, { pack: "2.5kg", price: 1900, perN: 2.5, perU: "kg", stock: 20 } ] },
      { name: "Chef Ketchup", brand: "Chef", img: IMG.redBottle,
        variants: [ { pack: "300g", price: 160, perN: 0.3, perU: "kg", stock: 45 }, { pack: "800g", price: 340, perN: 0.8, perU: "kg", stock: 30 } ] },
    ],
  },
  {
    slug: "beverages",
    name: "Beverages",
    products: [
      { name: "Nestle Milk Pak", brand: "Nestlé", img: IMG.dairyTin,
        variants: [ { pack: "250ml", price: 90, perN: 0.25, perU: "L", stock: 50 }, { pack: "1L", price: 300, perN: 1, perU: "L", stock: 40 } ] },
      { name: "Olpers Full Cream", brand: "Olpers", img: IMG.dairyTin,
        variants: [ { pack: "250ml", price: 95, perN: 0.25, perU: "L", stock: 50 }, { pack: "1L", price: 310, perN: 1, perU: "L", stock: 40 } ] },
      { name: "Coca-Cola", brand: "Coca-Cola", img: IMG.cola,
        variants: [ { pack: "1.5L", price: 200, perN: 1.5, perU: "L", stock: 45 }, { pack: "2.25L", price: 290, perN: 2.25, perU: "L", stock: 30 } ] },
      { name: "Sprite", brand: "Coca-Cola", img: IMG.soda,
        variants: [ { pack: "500ml", price: 90, perN: 0.5, perU: "L", stock: 50 }, { pack: "1.5L", price: 200, perN: 1.5, perU: "L", stock: 40 } ] },
      { name: "Sting Energy Drink", brand: "Sting", img: IMG.soda,
        variants: [ { pack: "345ml", price: 70, perN: 0.345, perU: "L", stock: 50 }, { pack: "500ml", price: 100, perN: 0.5, perU: "L", stock: 40 } ] },
      { name: "Lipton Yellow Label Tea", brand: "Lipton", img: IMG.tea2,
        variants: [ { pack: "190g", price: 480, perN: 0.19, perU: "kg", stock: 35 }, { pack: "380g", price: 900, perN: 0.38, perU: "kg", stock: 25 } ] },
      { name: "Tapal Danedar", brand: "Tapal", img: IMG.tea1,
        variants: [ { pack: "430g", price: 780, perN: 0.43, perU: "kg", stock: 35 }, { pack: "950g", price: 1650, perN: 0.95, perU: "kg", stock: 20 } ] },
      { name: "Nescafe Classic", brand: "Nestlé", img: IMG.coffee,
        variants: [ { pack: "50g", price: 780, perN: 0.05, perU: "kg", stock: 40 }, { pack: "100g", price: 1450, perN: 0.1, perU: "kg", stock: 25 } ] },
    ],
  },
  {
    slug: "snacks",
    name: "Snacks",
    products: [
      { name: "Lays Masala", brand: "Lays", img: IMG.chips,
        variants: [ { pack: "40g", price: 70, perN: 0.04, perU: "kg", stock: 50 }, { pack: "80g", price: 130, perN: 0.08, perU: "kg", stock: 40 } ] },
      { name: "Kurkure Chatpata", brand: "Kurkure", img: IMG.kurkure,
        variants: [ { pack: "55g", price: 60, perN: 0.055, perU: "kg", stock: 50 }, { pack: "110g", price: 110, perN: 0.11, perU: "kg", stock: 35 } ] },
      { name: "Slanty Salted", brand: "Slanty", img: IMG.chips,
        variants: [ { pack: "22g", price: 40, perN: 0.022, perU: "kg", stock: 50 } ] },
      { name: "Prince Biscuits Family Pack", brand: "LU", img: IMG.biscuit,
        variants: [ { pack: "Half Roll", price: 70, perN: 1, perU: "pack", stock: 50 }, { pack: "Family Pack", price: 200, perN: 3, perU: "pack", stock: 40 } ] },
      { name: "Sooper Biscuits Roll", brand: "EBM", img: IMG.biscuit,
        variants: [ { pack: "Snack Pack", price: 50, perN: 1, perU: "pack", stock: 50 }, { pack: "Roll", price: 150, perN: 3, perU: "pack", stock: 40 } ] },
      { name: "Peek Freans Sooper", brand: "EBM", img: IMG.biscuit,
        variants: [ { pack: "100g", price: 110, perN: 0.1, perU: "kg", stock: 45 } ] },
      { name: "Cadbury Dairy Milk", brand: "Cadbury", img: IMG.choc,
        variants: [ { pack: "38g", price: 180, perN: 0.038, perU: "kg", stock: 50 }, { pack: "95g", price: 420, perN: 0.095, perU: "kg", stock: 30 } ] },
      { name: "Dandy Bubblegum", brand: "Dandy", img: IMG.choc,
        variants: [ { pack: "Single", price: 15, perN: 1, perU: "pc", stock: 50 }, { pack: "Pack of 10", price: 140, perN: 10, perU: "pc", stock: 40 } ] },
    ],
  },
  {
    slug: "household",
    name: "Household",
    products: [
      { name: "Ariel Detergent", brand: "Ariel", img: IMG.detergent,
        variants: [ { pack: "500g", price: 480, perN: 0.5, perU: "kg", stock: 40 }, { pack: "1kg", price: 900, perN: 1, perU: "kg", stock: 30 } ] },
      { name: "Surf Excel Matic", brand: "Surf Excel", img: IMG.detergent,
        variants: [ { pack: "1kg", price: 850, perN: 1, perU: "kg", stock: 35 } ] },
      { name: "Bonus Detergent Bar", brand: "Bonus", img: IMG.detergent,
        variants: [ { pack: "Single", price: 60, perN: 1, perU: "bar", stock: 50 }, { pack: "Pack of 6", price: 330, perN: 6, perU: "bar", stock: 30 } ] },
      { name: "Lifebuoy Soap", brand: "Lifebuoy", img: IMG.soap,
        variants: [ { pack: "130g", price: 130, perN: 1, perU: "bar", stock: 50 }, { pack: "Pack of 3", price: 370, perN: 3, perU: "bar", stock: 40 } ] },
      { name: "Harpic Toilet Cleaner", brand: "Harpic", img: IMG.cleaner,
        variants: [ { pack: "500ml", price: 320, perN: 0.5, perU: "L", stock: 40 }, { pack: "1L", price: 580, perN: 1, perU: "L", stock: 25 } ] },
      { name: "Vim Dishwash Bar", brand: "Vim", img: IMG.liquidBottle,
        variants: [ { pack: "250g", price: 90, perN: 0.25, perU: "kg", stock: 50 }, { pack: "Pack of 3", price: 250, perN: 0.75, perU: "kg", stock: 35 } ] },
      { name: "Domex Multi-purpose", brand: "Domex", img: IMG.liquidBottle,
        variants: [ { pack: "500ml", price: 300, perN: 0.5, perU: "L", stock: 40 }, { pack: "1L", price: 560, perN: 1, perU: "L", stock: 25 } ] },
      { name: "Rose Petal Tissue Box", brand: "Rose Petal", img: IMG.tissue,
        variants: [ { pack: "100 sheets", price: 180, perN: 100, perU: "sheet", stock: 50 }, { pack: "200 sheets", price: 320, perN: 200, perU: "sheet", stock: 35 } ] },
    ],
  },
  {
    slug: "personal-care",
    name: "Personal Care",
    products: [
      { name: "Head & Shoulders Shampoo", brand: "Head & Shoulders", img: IMG.shampoo,
        variants: [ { pack: "185ml", price: 620, perN: 0.185, perU: "L", stock: 40 }, { pack: "360ml", price: 1050, perN: 0.36, perU: "L", stock: 25 } ] },
      { name: "Sunsilk Shampoo", brand: "Sunsilk", img: IMG.shampoo,
        variants: [ { pack: "200ml", price: 420, perN: 0.2, perU: "L", stock: 40 }, { pack: "380ml", price: 720, perN: 0.38, perU: "L", stock: 25 } ] },
      { name: "Colgate Total Toothpaste", brand: "Colgate", img: IMG.toothpaste,
        variants: [ { pack: "50g", price: 190, perN: 0.05, perU: "kg", stock: 50 }, { pack: "100g", price: 360, perN: 0.1, perU: "kg", stock: 35 } ] },
      { name: "Dettol Body Wash", brand: "Dettol", img: IMG.antiseptic,
        variants: [ { pack: "250ml", price: 550, perN: 0.25, perU: "L", stock: 40 }, { pack: "500ml", price: 950, perN: 0.5, perU: "L", stock: 25 } ] },
      { name: "Nivea Cold Cream", brand: "Nivea", img: IMG.babyCare,
        variants: [ { pack: "30ml", price: 250, perN: 0.03, perU: "L", stock: 45 }, { pack: "60ml", price: 420, perN: 0.06, perU: "L", stock: 30 } ] },
      { name: "Gillette Blue-II Razor", brand: "Gillette", img: IMG.razor,
        variants: [ { pack: "Pack of 5", price: 420, perN: 5, perU: "pc", stock: 45 }, { pack: "Pack of 10", price: 780, perN: 10, perU: "pc", stock: 30 } ] },
      { name: "Fair & Lovely", brand: "Fair & Lovely", img: IMG.babyCare,
        variants: [ { pack: "25g", price: 200, perN: 0.025, perU: "kg", stock: 50 }, { pack: "50g", price: 360, perN: 0.05, perU: "kg", stock: 35 } ] },
      { name: "Palmolive Soap", brand: "Palmolive", img: IMG.soap,
        variants: [ { pack: "145g", price: 150, perN: 1, perU: "bar", stock: 50 }, { pack: "Pack of 3", price: 430, perN: 3, perU: "bar", stock: 35 } ] },
    ],
  },
  {
    slug: "baby-kids",
    name: "Baby & Kids",
    products: [
      { name: "Canbebe Baby Diapers Small", brand: "Canbebe", img: IMG.diaper,
        variants: [ { pack: "Pack of 22", price: 850, perN: 22, perU: "pc", stock: 35 }, { pack: "Jumbo 46s", price: 1600, perN: 46, perU: "pc", stock: 20 } ] },
      { name: "Pampers Baby Dry Size 3", brand: "Pampers", img: IMG.diaper,
        variants: [ { pack: "Pack of 56", price: 1300, perN: 56, perU: "pc", stock: 30 }, { pack: "Jumbo 108s", price: 2400, perN: 108, perU: "pc", stock: 20 } ] },
      { name: "Johnson's Baby Shampoo", brand: "Johnson's", img: IMG.shampoo,
        variants: [ { pack: "100ml", price: 290, perN: 0.1, perU: "L", stock: 45 }, { pack: "200ml", price: 500, perN: 0.2, perU: "L", stock: 30 } ] },
      { name: "Cerelac Wheat & Milk", brand: "Nestlé", img: IMG.cereal,
        variants: [ { pack: "175g", price: 580, perN: 0.175, perU: "kg", stock: 35 }, { pack: "350g", price: 1080, perN: 0.35, perU: "kg", stock: 22 } ] },
      { name: "Nan Optipro 1", brand: "Nestlé", img: IMG.formula,
        variants: [ { pack: "400g", price: 2450, perN: 0.4, perU: "kg", stock: 30 }, { pack: "800g", price: 4600, perN: 0.8, perU: "kg", stock: 20 } ] },
      { name: "Mother's Choice Wet Wipes", brand: "Mother's Choice", img: IMG.wipes,
        variants: [ { pack: "72 wipes", price: 180, perN: 72, perU: "wipe", stock: 50 }, { pack: "120 wipes", price: 280, perN: 120, perU: "wipe", stock: 35 } ] },
      { name: "Farex Baby Cereal", brand: "Farex", img: IMG.cereal,
        variants: [ { pack: "175g", price: 560, perN: 0.175, perU: "kg", stock: 35 }, { pack: "300g", price: 920, perN: 0.3, perU: "kg", stock: 22 } ] },
      { name: "Mothercare Baby Lotion", brand: "Mothercare", img: IMG.babyCare,
        variants: [ { pack: "150ml", price: 420, perN: 0.15, perU: "L", stock: 40 }, { pack: "300ml", price: 720, perN: 0.3, perU: "L", stock: 25 } ] },
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
  console.log("🛒  Seeding Apex Mart grocery catalogue (PKR)…");
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
      await prisma.product.create({
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
              attributes: { packSize: v.pack, unitPrice: unitPrice(v) },
            })),
          },
        },
      });
      nProducts += 1;
      nVariants += p.variants.length;
      nImages += 1;
    }
  }

  const [categories, products, variants, images] = await Promise.all([
    prisma.category.count(),
    prisma.product.count(),
    prisma.productVariant.count(),
    prisma.productImage.count(),
  ]);

  console.log("✅  Apex Mart catalogue seeded:", {
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
