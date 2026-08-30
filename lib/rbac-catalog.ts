/**
 * Permission + role catalog — pure data, no server imports, so it can be shared
 * by the runtime authorizer (lib/permissions.ts) and the seed script.
 */
export const PERMISSIONS = {
  ORDERS_VIEW: "orders:view",
  ORDERS_FULFILL: "orders:fulfill",
  // Cancel a paid order — reserved for managers/admins (not routine staff).
  ORDERS_CANCEL: "orders:cancel",
  ORDERS_REFUND: "orders:refund",
  // Catalog work is split into granular capabilities so operations staff can
  // create drafts and edit content, while pricing, publishing and archiving
  // stay with managers/admins:
  CATALOG_CONTENT: "catalog:content", // create drafts + edit name/brand/images
  CATALOG_PRICING: "catalog:pricing", // edit variant price/stock
  CATALOG_PUBLISH: "catalog:publish", // change product status (publish/unpublish)
  CATALOG_ARCHIVE: "catalog:archive", // archive/restore (soft-delete)
  // Permanently delete a product — admin-only, kept separate from the reversible
  // archive so managers can archive but not destroy.
  CATALOG_DELETE: "catalog:delete",
  // Adjust stock (reason recorded in an InventoryLog) — allowed for staff.
  INVENTORY_ADJUST: "inventory:adjust",
  // Create/manage categories — managers/admins.
  CATEGORIES_MANAGE: "categories:manage",
  // Enable/disable an existing coupon.
  COUPONS_TOGGLE: "coupons:toggle",
  // Create and permanently delete coupons.
  COUPONS_MANAGE: "coupons:manage",
  CUSTOMERS_VIEW: "customers:view",
  REPORTS_VIEW: "reports:view",
  ACCESS_MANAGE: "access:manage",
  SUPER: "*",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  "orders:view": "View orders",
  "orders:fulfill": "Fulfill and update orders",
  "orders:cancel": "Cancel paid orders",
  "orders:refund": "Issue refunds",
  "catalog:content": "Create drafts and edit product content",
  "catalog:pricing": "Edit product prices and stock",
  "catalog:publish": "Publish or unpublish products",
  "catalog:archive": "Archive and restore products",
  "catalog:delete": "Permanently delete products",
  "inventory:adjust": "Adjust stock levels (reason required)",
  "categories:manage": "Create and manage categories",
  "coupons:toggle": "Enable or disable coupons",
  "coupons:manage": "Create and delete coupons",
  "customers:view": "View customers",
  "reports:view": "View reports and revenue",
  "access:manage": "Manage roles and access assignments",
  "*": "All permissions (super admin)",
};

/**
 * A role is a named bundle of permissions. `selfRequestable` roles can be
 * obtained via break-glass JIT elevation; others must be assigned by an admin.
 */
export const ROLE_CATALOG: Record<
  string,
  { description: string; selfRequestable: boolean; permissions: string[] }
> = {
  support: {
    description: "Read orders, customers, and reports",
    selfRequestable: true,
    permissions: [PERMISSIONS.ORDERS_VIEW, PERMISSIONS.CUSTOMERS_VIEW, PERMISSIONS.REPORTS_VIEW],
  },
  fulfillment: {
    description: "Fulfill orders and edit catalog content and stock",
    selfRequestable: true,
    permissions: [
      PERMISSIONS.ORDERS_VIEW,
      PERMISSIONS.ORDERS_FULFILL,
      PERMISSIONS.CATALOG_CONTENT,
      PERMISSIONS.INVENTORY_ADJUST,
    ],
  },
  finance: {
    description: "Issue refunds and view financial reports",
    selfRequestable: true,
    permissions: [PERMISSIONS.ORDERS_VIEW, PERMISSIONS.ORDERS_REFUND, PERMISSIONS.REPORTS_VIEW],
  },
  // Operations lead: everything needed to run the store day-to-day, but no
  // access management, no permanent deletes, and no payment/security settings
  // (those stay with admins via SUPER). Assigned by an admin, never self-granted.
  manager: {
    description: "Run daily operations — publishing, pricing, refunds, categories, reports",
    selfRequestable: false,
    permissions: [
      PERMISSIONS.ORDERS_VIEW,
      PERMISSIONS.ORDERS_FULFILL,
      PERMISSIONS.ORDERS_CANCEL,
      PERMISSIONS.ORDERS_REFUND,
      PERMISSIONS.CATALOG_CONTENT,
      PERMISSIONS.CATALOG_PRICING,
      PERMISSIONS.CATALOG_PUBLISH,
      PERMISSIONS.CATALOG_ARCHIVE,
      PERMISSIONS.INVENTORY_ADJUST,
      PERMISSIONS.CATEGORIES_MANAGE,
      PERMISSIONS.COUPONS_TOGGLE,
      PERMISSIONS.COUPONS_MANAGE,
      PERMISSIONS.CUSTOMERS_VIEW,
      PERMISSIONS.REPORTS_VIEW,
    ],
  },
  admin: {
    description: "Full access (super admin)",
    selfRequestable: false,
    permissions: [PERMISSIONS.SUPER],
  },
};
