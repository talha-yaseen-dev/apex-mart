import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  findUser: vi.fn(),
  countProducts: vi.fn(),
  deleteProducts: vi.fn(),
  createAudit: vi.fn(),
  transaction: vi.fn(),
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
  revalidateTag: mocks.revalidateTag,
}));
vi.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique: mocks.findUser },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/lib/authz", () => ({ authorize: mocks.authorize, can: vi.fn() }));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));
vi.mock("@/lib/admin", () => ({ ORDER_TRANSITIONS: {} }));
vi.mock("@/lib/notify", () => ({
  notifyOrderRefunded: vi.fn(),
  notifyOrderShipped: vi.fn(),
}));

import { deleteAllProductsAction } from "@/lib/actions/admin";

describe("deleteAllProductsAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authorize.mockResolvedValue({ id: "admin-1", email: "owner@example.com" });
    mocks.findUser.mockResolvedValue({ isPrimaryAdmin: true });
    mocks.countProducts.mockResolvedValue(3);
    mocks.deleteProducts.mockResolvedValue({ count: 3 });
    mocks.createAudit.mockResolvedValue({});
    const tx = {
      product: { count: mocks.countProducts, deleteMany: mocks.deleteProducts },
      auditLog: { create: mocks.createAudit },
    };
    mocks.transaction.mockImplementation(
      (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
    );
  });

  it("refuses bulk deletion for anyone other than the primary admin", async () => {
    mocks.findUser.mockResolvedValue({ isPrimaryAdmin: false });

    expect(await deleteAllProductsAction(3)).toMatchObject({ ok: false });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("refuses a stale confirmation count before deleting anything", async () => {
    expect(await deleteAllProductsAction(2)).toMatchObject({ ok: false });
    expect(mocks.deleteProducts).not.toHaveBeenCalled();
    expect(mocks.createAudit).not.toHaveBeenCalled();
  });

  it("deletes the catalog and records the count in the audit log", async () => {
    expect(await deleteAllProductsAction(3)).toEqual({ ok: true, deleted: 3 });
    expect(mocks.deleteProducts).toHaveBeenCalledOnce();
    expect(mocks.createAudit).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: "admin-1",
        action: "product.delete_all",
        diff: { deletedProducts: 3 },
      }),
    });
    expect(mocks.revalidateTag).toHaveBeenCalledWith("catalog");
  });
});
