import { describe, it, expect, vi } from "vitest";

// If anything tried to touch the DB, we'd notice — the route must not.
vi.mock("@/lib/db", () => import("./helpers/db-mock"));

import { POST } from "@/app/api/v1/auth/register/route";
import * as authActions from "@/lib/actions/auth";
import { allUsers } from "./helpers/db-mock";

/**
 * The old public REST registration path created an inactive User and verified it
 * later. It must no longer exist as an alternate way to create an account before
 * OTP verification.
 */
describe("public REST registration is disabled", () => {
  it("POST /api/v1/auth/register returns 410 Gone and creates no account", async () => {
    const req = new Request("http://localhost/api/v1/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Ada Lovelace", email: "x@example.com", password: "Str0ng!Passw0rd" }),
    });
    const res = await POST(req, undefined as never);
    expect(res.status).toBe(410);
    expect(allUsers()).toHaveLength(0);
  });

  it("the account-creating registerAction is no longer exported", () => {
    expect("registerAction" in authActions).toBe(false);
  });
});
