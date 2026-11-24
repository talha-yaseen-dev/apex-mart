# Apex Tyres

A Next.js tyre storefront for bike, car, and truck tyres. It includes tyre size filtering, product pages, cart and cash-on-delivery checkout, customer accounts, order tracking, and an admin catalogue.

## Run locally

From `~/Claude/Mart/mart-shop`:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The app uses the PostgreSQL database configured by `DATABASE_URL` in `.env`.

## Import real inventory

The catalog includes real manufacturer models, specifications, and official product images documented in [inventory/catalog-sources.md](inventory/catalog-sources.md). The listed PKR prices and five units per variant make ordering work for this class project; they are project values, not verified store quotes or physical inventory. The owner can replace them in Admin Products and Inventory. Fill [inventory/tyres-template.csv](inventory/tyres-template.csv) with one row per SKU and tyre size when shop inventory is confirmed. Required columns are product slug, product name, brand, category slug (`bike-tyres`, `car-tyres`, or `truck-tyres`), SKU, tyre size, price and stock columns, and at least one product image path or HTTPS image URL per product. Leave both price and stock blank for quote-only products; supply a positive PKR price and non-negative stock together to enable normal checkout. Optional columns include pattern, construction, position, season, tubeless, load index, speed rating, ply rating, description, usage, and manufacturer source URL.

Local photo paths are relative to the CSV file. The importer copies them into `public/tyre-products/` with content-based filenames; commit those files along with the code when deploying. HTTPS image URLs are used as supplied. Product images should be photos of the actual SKU or model, with permission to use them.

Preview validation without changing the database:

```bash
npm run db:import:tyres -- inventory/your-inventory.csv
```

After reviewing the CSV and confirming which database `.env` points to, import:

```bash
npm run db:import:tyres -- inventory/your-inventory.csv --apply
```

Add `--archive-missing` only when the CSV contains the *complete* current tyre inventory. It archives tyre products missing from the file and sets missing variants' stock to zero. Imports update prices and quantities to the exact values in the CSV. The importer preserves product and order history; it does not delete old orders. The public catalogue only shows products in the three tyre categories.

## Checks

```bash
npx tsc --noEmit
npm run lint
npm test
npm run build
```
