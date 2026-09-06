import { describe, it, expect, beforeEach, vi } from "vitest";

// `new Resend()` runs at lib/email MODULE LOAD, so the mock's send fn must exist
// before imports — declare it (and the mutable result it returns) via vi.hoisted.
const h = vi.hoisted(() => {
  const state = {
    result: { data: { id: "email_1" }, error: null } as { data: unknown; error: unknown },
  };
  return { state, sendMock: vi.fn(async () => state.result) };
});
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: h.sendMock };
  },
}));
// Enable the real send path with a (fake) key + verified sender.
vi.mock("@/lib/env", () => ({
  env: { RESEND_API_KEY: "re_test_key_SECRET", EMAIL_FROM: "Apex Mart <no-reply@test.dev>" },
}));

import { sendEmail } from "@/lib/email";

const msg = { to: "user@example.com", subject: "Your code", html: "<div>482731</div>" };

beforeEach(() => {
  h.state.result = { data: { id: "email_1" }, error: null };
  h.sendMock.mockClear();
});

describe("sendEmail — inspects the provider result", () => {
  it("resolves when Resend returns a success result", async () => {
    await expect(sendEmail(msg)).resolves.toBeUndefined();
    expect(h.sendMock).toHaveBeenCalledOnce();
  });

  it("THROWS when Resend returns an error result WITHOUT throwing", async () => {
    h.state.result = { data: null, error: { name: "rate_limit_exceeded", message: "too many requests" } };
    await expect(sendEmail(msg)).rejects.toThrow("Email delivery failed");
  });

  it("logs only a safe error code — never the API key, HTML body, or verification code", async () => {
    h.state.result = { data: null, error: { name: "validation_error", message: "bad sender" } };
    const logs: string[] = [];
    const spy = vi.spyOn(console, "error").mockImplementation((...a) => void logs.push(JSON.stringify(a)));
    await expect(sendEmail(msg)).rejects.toThrow();
    spy.mockRestore();
    const joined = logs.join(" ");
    expect(joined).toContain("validation_error"); // safe provider code IS logged
    expect(joined).not.toContain("re_test_key_SECRET"); // API key never logged
    expect(joined).not.toContain("482731"); // verification code never logged
    expect(joined).not.toContain("<div>"); // HTML body never logged
  });
});
