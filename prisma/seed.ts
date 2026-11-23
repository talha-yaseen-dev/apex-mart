/** Seed only the tyre category structure. Product inventory is imported from store records. */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  for (const [slug, name] of [
    ["bike-tyres", "Bike Tyres"],
    ["car-tyres", "Car Tyres"],
    ["truck-tyres", "Truck Tyres"],
  ] as const) {
    await prisma.category.upsert({ where: { slug }, update: { name }, create: { slug, name } });
  }
  console.log("Tyre categories ready. Import verified prices, stock, and photos with npm run db:import:tyres.");
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
