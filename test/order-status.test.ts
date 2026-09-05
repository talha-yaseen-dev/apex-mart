import { describe, it, expect } from "vitest";
import { orderStage, orderStatusLabel, STAGE_LABEL } from "@/lib/order-status";

describe("orderStage", () => {
  it("treats PENDING and PAID as 'placed' (COD: cash due on delivery)", () => {
    expect(orderStage("PENDING")).toBe("placed");
    expect(orderStage("PAID")).toBe("placed");
  });

  it("splits FULFILLED into packed vs out-for-delivery by shipment", () => {
    expect(orderStage("FULFILLED")).toBe("packed");
    expect(orderStage("FULFILLED", "PENDING")).toBe("packed");
    expect(orderStage("FULFILLED", "SHIPPED")).toBe("shipped");
    expect(orderStage("FULFILLED", "IN_TRANSIT")).toBe("shipped");
  });

  it("maps terminal states", () => {
    expect(orderStage("DELIVERED")).toBe("delivered");
    expect(orderStage("CANCELLED")).toBe("cancelled");
    expect(orderStage("REFUNDED")).toBe("refunded");
  });
});

describe("orderStatusLabel", () => {
  it("never surfaces the raw 'PAID' enum to a COD shopper", () => {
    expect(orderStatusLabel("PAID")).toBe("Order placed");
    expect(orderStatusLabel("PAID")).not.toMatch(/paid/i);
  });

  it("labels each stage from the shared table", () => {
    expect(orderStatusLabel("FULFILLED")).toBe(STAGE_LABEL.packed);
    expect(orderStatusLabel("DELIVERED")).toBe(STAGE_LABEL.delivered);
  });
});
