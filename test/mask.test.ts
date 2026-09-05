import { describe, it, expect } from "vitest";
import { maskEmail } from "@/lib/mask";

describe("maskEmail", () => {
  it("keeps the first local char and the full domain", () => {
    expect(maskEmail("talha@gmail.com")).toBe("t***@gmail.com");
    expect(maskEmail("a@b.co")).toBe("a***@b.co");
  });

  it("does not reveal the local-part length", () => {
    expect(maskEmail("short@x.com")).toBe("s***@x.com");
    expect(maskEmail("averylonglocalpart@x.com")).toBe("a***@x.com");
  });

  it("returns malformed input unchanged", () => {
    expect(maskEmail("notanemail")).toBe("notanemail");
    expect(maskEmail("@nolocal.com")).toBe("@nolocal.com");
  });
});
