import { describe, it, expect } from "vitest";
import {
  passwordChecks,
  passwordScore,
  registerSchema,
  signInSchema,
} from "@/lib/validations/auth";

describe("password policy", () => {
  it("reports the four requirement checks", () => {
    expect(passwordChecks("abc").map((c) => c.ok)).toEqual([false, false, false, false]);
    expect(passwordChecks("Abcd1234!").map((c) => c.ok)).toEqual([true, true, true, true]);
  });

  it("scores strength 0..4", () => {
    expect(passwordScore("abc")).toBe(0);
    expect(passwordScore("abcdefgh")).toBe(1); // length only
    expect(passwordScore("Abcdefg1")).toBe(3); // len + upper + number
    expect(passwordScore("Abcdefg1!")).toBe(4);
  });

  it("registerSchema rejects weak passwords (needs 3/4 and 8+ chars)", () => {
    expect(registerSchema.safeParse({ name: "Ahmed Khan", email: "a@b.com", password: "weak" }).success).toBe(false);
    expect(registerSchema.safeParse({ name: "Ahmed Khan", email: "a@b.com", password: "alllowercase" }).success).toBe(false);
  });

  it("registerSchema accepts a strong password and normalizes email", () => {
    const res = registerSchema.safeParse({ name: "  Ahmed Khan ", email: "AHMED@EXAMPLE.COM", password: "Abcd1234!" });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.email).toBe("ahmed@example.com"); // trimmed + lowercased
      expect(res.data.name).toBe("Ahmed Khan"); // trimmed
    }
  });

  it("signInSchema only requires a non-empty password", () => {
    expect(signInSchema.safeParse({ email: "a@b.com", password: "" }).success).toBe(false);
    expect(signInSchema.safeParse({ email: "a@b.com", password: "x" }).success).toBe(true);
  });
});
