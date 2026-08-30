"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

const schema = z.object({
  id: z.string().optional(),
  label: z.string().trim().min(1),
  name: z.string().trim().min(1),
  line1: z.string().trim().min(1),
  line2: z.string().trim().optional().default(""),
  city: z.string().trim().min(1),
  region: z.string().trim().min(1),
  postalCode: z.string().trim().min(1),
  country: z.string().trim().min(2),
  isDefault: z.boolean().default(false),
});

export async function saveAddressAction(input: unknown) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "Please sign in." };
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Fill in label, name, street, city, region, and postal code." };
  }
  const d = parsed.data;
  const data = {
    label: d.label,
    name: d.name,
    line1: d.line1,
    line2: d.line2 || null,
    city: d.city,
    region: d.region,
    postalCode: d.postalCode,
    country: d.country,
    isDefault: d.isDefault,
  };

  if (d.isDefault) {
    await prisma.address.updateMany({
      where: { userId: user.id },
      data: { isDefault: false },
    });
  }
  if (d.id) {
    // Ownership-scoped update.
    await prisma.address.updateMany({
      where: { id: d.id, userId: user.id },
      data,
    });
  } else {
    await prisma.address.create({ data: { ...data, userId: user.id } });
  }
  revalidatePath("/account/addresses");
  return { ok: true as const };
}

export async function deleteAddressAction(id: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const };
  await prisma.address.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/account/addresses");
  return { ok: true as const };
}

export async function setDefaultAddressAction(id: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const };
  await prisma.$transaction([
    prisma.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } }),
    prisma.address.updateMany({ where: { id, userId: user.id }, data: { isDefault: true } }),
  ]);
  revalidatePath("/account/addresses");
  return { ok: true as const };
}
