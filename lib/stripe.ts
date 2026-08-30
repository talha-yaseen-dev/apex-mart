import "server-only";
import Stripe from "stripe";
import { env } from "@/lib/env";

/**
 * Stripe client — null when no *usable* secret key is configured, so the
 * checkout falls back to a dev capture path instead of failing.
 *
 * A key only counts if it's a real Stripe secret, not the `.env.example`
 * placeholder (`sk_test_xxx`). Treating the placeholder as configured would
 * make every checkout call the Stripe API with a bogus key and fail at the
 * payment step — so a missing OR placeholder key uses the local dev path.
 */
const key = env.STRIPE_SECRET_KEY ?? "";
const keyUsable = /^sk_(test|live)_[A-Za-z0-9]{16,}$/.test(key);

export const stripe: Stripe | null = keyUsable ? new Stripe(key) : null;

export const stripeEnabled = stripe !== null;
