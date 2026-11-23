/** Import verified store inventory from a CSV; dry-run unless --apply is passed. */
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { extname, isAbsolute, join, resolve, dirname } from "node:path";
import { InvReason, PrismaClient, ProductStatus } from "@prisma/client";

const CATEGORY_NAMES = {
  "bike-tyres": "Bike Tyres",
  "car-tyres": "Car Tyres",
  "truck-tyres": "Truck Tyres",
} as const;
type CategorySlug = keyof typeof CATEGORY_NAMES;

const REQUIRED = [
  "product_slug", "product_name", "brand", "category_slug", "sku", "tyre_size",
  "price_pkr", "stock", "image_paths",
] as const;

const SPEC_COLUMNS = {
  pattern: "pattern",
  construction: "construction",
  position: "position",
  season: "season",
  tubeless: "tubeless",
  load_index: "loadIndex",
  speed_rating: "speedRating",
  ply_rating: "plyRating",
  description: "description",
  usage: "usage",
  source_url: "sourceUrl",
} as const;

type InventoryRow = {
  slug: string;
  name: string;
  brand: string;
  category: CategorySlug;
  sku: string;
  size: string;
  priceMinor: number;
  stock: number;
  images: string[];
  attributes: Record<string, string>;
};

function parseCsv(source: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (quoted) {
      if (ch === '"' && source[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') {
      if (cell) throw new Error(`Unexpected quote near character ${i + 1}`);
      quoted = true;
    } else if (ch === ",") {
      row.push(cell); cell = "";
    } else if (ch === "\n") {
      row.push(cell.replace(/\r$/, "")); cell = "";
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }
  if (quoted) throw new Error("Unclosed quoted CSV field");
  if (cell || row.length) {
    row.push(cell.replace(/\r$/, ""));
    if (row.some((value) => value.trim())) rows.push(row);
  }
  return rows;
}

function imagePath(ref: string, csvFile: string): string {
  if (/^https:\/\//i.test(ref)) {
    const url = new URL(ref);
    if (!url.hostname) throw new Error(`Invalid image URL: ${ref}`);
    return ref;
  }
  if (/^[a-z]+:\/\//i.test(ref)) throw new Error(`Only HTTPS image URLs are accepted: ${ref}`);
  const source = isAbsolute(ref) ? ref : resolve(dirname(csvFile), ref);
  if (!existsSync(source) || !statSync(source).isFile()) throw new Error(`Image file not found: ${source}`);
  const ext = extname(source).toLowerCase();
  if (![".jpg", ".jpeg", ".png", ".webp", ".avif"].includes(ext))
    throw new Error(`Unsupported product image type: ${source}`);
  return source;
}

function loadRows(csvFile: string): InventoryRow[] {
  const parsed = parseCsv(readFileSync(csvFile, "utf8").replace(/^\uFEFF/, ""));
  if (parsed.length < 2) throw new Error("Inventory CSV needs a header and at least one product row.");
  const headers = parsed[0].map((h) => h.trim().toLowerCase());
  if (new Set(headers).size !== headers.length) throw new Error("CSV header contains duplicate columns.");
  for (const column of REQUIRED) if (!headers.includes(column)) throw new Error(`Missing CSV column: ${column}`);
  const rows: InventoryRow[] = [];
  const seenSku = new Set<string>();
  const products = new Map<string, { name: string; brand: string; category: CategorySlug; images: Set<string> }>();

  for (let i = 1; i < parsed.length; i++) {
    const cells = parsed[i];
    if (cells.length > headers.length) throw new Error(`Row ${i + 1} has more values than columns.`);
    const record = Object.fromEntries(headers.map((key, n) => [key, (cells[n] ?? "").trim()]));
    const value = (key: string) => record[key] ?? "";
    const slug = value("product_slug");
    const name = value("product_name");
    const brand = value("brand");
    const category = value("category_slug") as CategorySlug;
    const sku = value("sku").toUpperCase();
    const size = value("tyre_size");
    const priceText = value("price_pkr");
    const stockText = value("stock");
    const images = value("image_paths").split("|").map((x) => x.trim()).filter(Boolean)
      .map((x) => imagePath(x, csvFile));

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error(`Row ${i + 1}: invalid product_slug.`);
    if (!name || !brand) throw new Error(`Row ${i + 1}: product_name and brand are required.`);
    if (!(category in CATEGORY_NAMES)) throw new Error(`Row ${i + 1}: invalid category_slug.`);
    if (!/^[A-Z0-9._-]{2,80}$/.test(sku)) throw new Error(`Row ${i + 1}: invalid SKU.`);
    if (seenSku.has(sku)) throw new Error(`Duplicate SKU in CSV: ${sku}`);
    seenSku.add(sku);
    if (size.length < 3 || size.length > 40) throw new Error(`Row ${i + 1}: invalid tyre_size.`);
    const quoteOnly = priceText === "" && stockText === "";
    if (!quoteOnly && (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(priceText) || Number(priceText) <= 0))
      throw new Error(`Row ${i + 1}: price_pkr must be positive, or leave price and stock blank for Ask for price.`);
    if (!quoteOnly && !/^(?:0|[1-9]\d*)$/.test(stockText))
      throw new Error(`Row ${i + 1}: stock must be a non-negative whole number, or leave price and stock blank.`);
    const priceMinor = quoteOnly ? 0 : Math.round(Number(priceText) * 100);
    const stock = quoteOnly ? 0 : Number(stockText);
    if (!Number.isSafeInteger(priceMinor) || !Number.isSafeInteger(stock))
      throw new Error(`Row ${i + 1}: price or stock is too large.`);

    const previous = products.get(slug);
    if (previous && (previous.name !== name || previous.brand !== brand || previous.category !== category))
      throw new Error(`Row ${i + 1}: product ${slug} has inconsistent name, brand or category.`);
    const product = previous ?? { name, brand, category, images: new Set<string>() };
    images.forEach((path) => product.images.add(path));
    products.set(slug, product);

    const attributes: Record<string, string> = { size };
    for (const [column, key] of Object.entries(SPEC_COLUMNS)) {
      if (value(column)) attributes[key] = value(column);
    }
    if (attributes.sourceUrl && !/^https:\/\//i.test(attributes.sourceUrl))
      throw new Error(`Row ${i + 1}: source_url must use HTTPS.`);
    rows.push({ slug, name, brand, category, sku, size, priceMinor, stock, images, attributes });
  }
  for (const [slug, product] of products) {
    if (!product.images.size) throw new Error(`Product ${slug} needs at least one real image path or HTTPS URL.`);
  }
  return rows;
}

function publishedImage(ref: string): string {
  if (/^https:\/\//i.test(ref)) return ref;
  const bytes = readFileSync(ref);
  const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 16);
  const ext = extname(ref).toLowerCase();
  const directory = join(process.cwd(), "public", "tyre-products");
  mkdirSync(directory, { recursive: true });
  const filename = `${hash}${ext}`;
  const destination = join(directory, filename);
  if (!existsSync(destination)) copyFileSync(ref, destination);
  return `/tyre-products/${filename}`;
}

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((arg) => !arg.startsWith("--"));
  if (!file) throw new Error("Usage: npm run db:import:tyres -- path/to/inventory.csv [--apply] [--archive-missing]");
  const csvFile = resolve(file);
  const apply = args.includes("--apply");
  const archiveMissing = args.includes("--archive-missing");
  const unknown = args.filter((arg) => arg.startsWith("--") && !["--apply", "--archive-missing"].includes(arg));
  if (unknown.length) throw new Error(`Unknown option: ${unknown.join(", ")}`);
  if (archiveMissing && !apply) throw new Error("--archive-missing requires --apply.");
  const rows = loadRows(csvFile);
  const productSlugs = [...new Set(rows.map((row) => row.slug))];
  console.log(`${apply ? "Applying" : "Previewing"} ${rows.length} SKUs across ${productSlugs.length} products.`);
  console.log("Categories:", [...new Set(rows.map((row) => row.category))].join(", "));
  console.log("In-stock SKUs:", rows.filter((row) => row.stock > 0).length);
  console.log("Photo sources:", new Set(rows.flatMap((row) => row.images)).size);
  if (!apply) {
    console.log("No database or files changed. Review the CSV, then rerun with --apply.");
    return;
  }

  const prisma = new PrismaClient();
  try {
    const known = await prisma.productVariant.findMany({
      where: { sku: { in: rows.map((row) => row.sku) } },
      select: { sku: true, product: { select: { slug: true } } },
    });
    for (const variant of known) {
      const incoming = rows.find((row) => row.sku === variant.sku)!;
      if (variant.product.slug !== incoming.slug)
        throw new Error(`SKU ${variant.sku} already belongs to ${variant.product.slug}. No changes made.`);
    }

    // Copy local photos before the database transaction so every saved URL exists.
    const imageUrls = new Map<string, string[]>();
    for (const slug of productSlugs) {
      const refs = new Set(rows.filter((row) => row.slug === slug).flatMap((row) => row.images));
      imageUrls.set(slug, [...refs].map(publishedImage));
    }

    await prisma.$transaction(async (tx) => {
      const categoryIds = new Map<CategorySlug, string>();
      for (const [slug, name] of Object.entries(CATEGORY_NAMES)) {
        const category = await tx.category.upsert({
          where: { slug }, update: { name }, create: { slug, name },
        });
        categoryIds.set(slug as CategorySlug, category.id);
      }
      if (archiveMissing) {
        const retired = await tx.productVariant.findMany({
          where: { product: { status: ProductStatus.ACTIVE, category: { slug: { in: Object.keys(CATEGORY_NAMES) } }, slug: { notIn: productSlugs } }, stock: { gt: 0 } },
          select: { id: true, stock: true },
        });
        for (const variant of retired) {
          await tx.productVariant.update({ where: { id: variant.id }, data: { stock: 0 } });
          await tx.inventoryLog.create({ data: { variantId: variant.id, delta: -variant.stock, reason: InvReason.ADJUSTMENT } });
        }
        await tx.product.updateMany({
          where: { status: ProductStatus.ACTIVE, category: { slug: { in: Object.keys(CATEGORY_NAMES) } }, slug: { notIn: productSlugs } },
          data: { status: ProductStatus.ARCHIVED },
        });
      }
      for (const slug of productSlugs) {
        const productRows = rows.filter((row) => row.slug === slug);
        const first = productRows[0];
        const product = await tx.product.upsert({
          where: { slug },
          update: { name: first.name, brand: first.brand, categoryId: categoryIds.get(first.category)!, status: ProductStatus.ACTIVE, deletedAt: null },
          create: { slug, name: first.name, brand: first.brand, categoryId: categoryIds.get(first.category)!, status: ProductStatus.ACTIVE },
        });
        if (archiveMissing) {
          const retired = await tx.productVariant.findMany({
            where: { productId: product.id, sku: { notIn: productRows.map((row) => row.sku) }, stock: { gt: 0 } },
            select: { id: true, stock: true },
          });
          for (const variant of retired) {
            await tx.productVariant.update({ where: { id: variant.id }, data: { stock: 0 } });
            await tx.inventoryLog.create({ data: { variantId: variant.id, delta: -variant.stock, reason: InvReason.ADJUSTMENT } });
          }
        }
        await tx.productImage.deleteMany({ where: { productId: product.id } });
        await tx.productImage.createMany({
          data: imageUrls.get(slug)!.map((url, position) => ({ productId: product.id, url, alt: `${first.name} tyre`, position })),
        });
        for (const row of productRows) {
          const existing = await tx.productVariant.findUnique({ where: { sku: row.sku }, select: { id: true, productId: true, stock: true } });
          if (existing && existing.productId !== product.id)
            throw new Error(`SKU ${row.sku} belongs to another product. No changes made.`);
          const variant = await tx.productVariant.upsert({
            where: { sku: row.sku },
            update: { priceMinor: row.priceMinor, stock: row.stock, currency: "PKR", attributes: row.attributes },
            create: { productId: product.id, sku: row.sku, priceMinor: row.priceMinor, stock: row.stock, currency: "PKR", attributes: row.attributes },
          });
          const delta = row.stock - (existing?.stock ?? 0);
          if (delta !== 0) {
            await tx.inventoryLog.create({ data: { variantId: variant.id, delta, reason: InvReason.ADJUSTMENT } });
          }
        }
      }
    }, { maxWait: 10_000, timeout: 120_000 });
    console.log("Imported inventory from the supplied CSV. Restart the development server to refresh cached catalogue data.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
