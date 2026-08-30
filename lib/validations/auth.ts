import { z } from "zod";

/**
 * Password strength — the server-side source of truth that the client meter in
 * the sign-up / reset forms mirrors exactly (8+ chars, uppercase, number,
 * symbol). Registration requires a score of at least 3 of 4.
 */
export function passwordChecks(pw: string) {
  return [
    { label: "8+ characters", ok: pw.length >= 8 },
    { label: "Uppercase", ok: /[A-Z]/.test(pw) },
    { label: "Number", ok: /[0-9]/.test(pw) },
    { label: "Symbol", ok: /[^A-Za-z0-9]/.test(pw) },
  ];
}

export function passwordScore(pw: string): number {
  return passwordChecks(pw).filter((c) => c.ok).length;
}

export const STRENGTH_LABELS = ["Weak", "Weak", "Fair", "Good", "Strong"] as const;

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address.");

export const strongPasswordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .refine((pw) => passwordScore(pw) >= 3, "Choose a stronger password.");

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password."),
});

export const nameSchema = z
  .string()
  .trim()
  .min(2, "Enter your name.")
  .max(80, "That name is too long.");

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: strongPasswordSchema,
});

export const forgotSchema = z.object({
  email: emailSchema,
});

export const resetSchema = z
  .object({
    token: z.string().min(1),
    password: strongPasswordSchema,
    confirm: z.string().min(1),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Passwords do not match.",
    path: ["confirm"],
  });

export type SignInInput = z.infer<typeof signInSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotInput = z.infer<typeof forgotSchema>;
export type ResetInput = z.infer<typeof resetSchema>;
