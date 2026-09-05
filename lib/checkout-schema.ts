import { z } from "zod";
import { isValidPKPhone } from "@/lib/phone";

/**
 * Checkout form contract — shared by the client form (react-hook-form resolver)
 * and the server action (re-validation). Kept in a plain module so both sides
 * import the same schema.
 */
export const checkoutFormSchema = z.object({
  // Contact
  name: z.string().trim().min(2, "Please enter your full name."),
  phone: z
    .string()
    .trim()
    .refine(isValidPKPhone, "Enter a valid Pakistani mobile (e.g. 03001234567)."),
  email: z
    .union([z.literal(""), z.string().trim().email("Enter a valid email address.")])
    .optional(),
  // Address
  street: z.string().trim().min(3, "Please enter your street / house address."),
  area: z.string().trim().min(1, "Please enter your area or locality."),
  city: z.string().trim().min(1, "Please enter your city."),
  zoneId: z.string().trim().min(1, "Please select your delivery zone."),
  riderNote: z.string().trim().max(200).optional().default(""),
  saveAddress: z.boolean().optional().default(true),
  // Fulfilment
  // Delivery slot removed from the UI — kept optional for backward compatibility.
  slot: z.string().trim().optional().default(""),
  // Payment
  payment: z.literal("cod"),
  orderNote: z.string().trim().max(300).optional().default(""),
});

export type CheckoutFormInput = z.infer<typeof checkoutFormSchema>;

export type PlaceOrderError = {
  ok: false;
  error: string;
  fieldErrors?: Record<string, string>;
};
