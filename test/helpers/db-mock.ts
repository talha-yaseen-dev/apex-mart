import { Prisma } from "@prisma/client";

/**
 * Minimal in-memory Prisma double for auth/OTP tests. Implements exactly the
 * operations lib/otp.ts, lib/tokens.ts, and the auth/email-change actions use,
 * with real unique-constraint behaviour (throws P2002) so collision paths are
 * exercised. NOT a general Prisma emulator — it covers `user` and
 * `verificationToken` only. Import the same module the code imports so both
 * share one store; call `reset()` between tests.
 */

type User = Record<string, unknown> & { id: string };
type Token = {
  id: string;
  identifier: string;
  tokenHash: string;
  type: string;
  expiresAt: Date;
  createdAt: Date;
};

let users: User[] = [];
let tokens: Token[] = [];
let seq = 0;
let failCreate = false; // one-shot fault injection for user.create
let failUpdate = false; // one-shot fault injection for user.update
const nextId = (p: string) => `${p}_${++seq}`;

function p2002(target: string): never {
  throw new Prisma.PrismaClientKnownRequestError(`Unique constraint failed on ${target}`, {
    code: "P2002",
    clientVersion: "test",
    meta: { target: [target] },
  });
}

function userMatches(u: User, where: Record<string, unknown>): boolean {
  if ("id" in where) return u.id === where.id;
  if ("email" in where) return u.email === where.email;
  if ("phone" in where) return u.phone === where.phone;
  return false;
}

export const prisma = {
  user: {
    findUnique: async ({ where }: { where: Record<string, unknown>; select?: unknown }) =>
      users.find((u) => userMatches(u, where)) ?? null,

    findFirst: async ({ where }: { where?: Record<string, unknown> }) =>
      (where ? users.find((u) => userMatches(u, where)) : users[0]) ?? null,

    create: async ({ data }: { data: Record<string, unknown> }) => {
      if (failCreate) {
        failCreate = false;
        throw new Error("simulated DB failure during user.create");
      }
      if (data.email && users.some((u) => u.email === data.email)) p2002("email");
      if (data.phone && users.some((u) => u.phone === data.phone)) p2002("phone");
      const u: User = {
        id: (data.id as string) ?? nextId("user"),
        role: "CUSTOMER",
        isEmployee: false,
        isPrimaryAdmin: false,
        isGuest: false,
        emailVerified: null,
        deactivatedAt: null,
        phone: null,
        image: null,
        ...data,
      };
      users.push(u);
      return u;
    },

    update: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
      if (failUpdate) {
        failUpdate = false;
        throw new Error("simulated DB failure during user.update");
      }
      const u = users.find((x) => userMatches(x, where));
      if (!u) p2002("id"); // Prisma would throw P2025; not needed for our tests
      if (data.email && data.email !== u!.email && users.some((x) => x.email === data.email)) {
        p2002("email");
      }
      if (data.phone && data.phone !== u!.phone && users.some((x) => x.phone === data.phone)) {
        p2002("phone");
      }
      Object.assign(u!, data);
      return u!;
    },
  },

  verificationToken: {
    create: async ({ data }: { data: Omit<Token, "id" | "createdAt"> }) => {
      if (tokens.some((t) => t.tokenHash === data.tokenHash)) p2002("tokenHash");
      const t: Token = { id: nextId("tok"), createdAt: new Date(), ...data };
      tokens.push(t);
      return t;
    },

    findUnique: async ({ where }: { where: { tokenHash: string } }) =>
      tokens.find((t) => t.tokenHash === where.tokenHash) ?? null,

    deleteMany: async ({
      where,
    }: {
      where: { id?: string; type?: string; identifier?: string | { startsWith: string } };
    }) => {
      const before = tokens.length;
      tokens = tokens.filter((t) => {
        if (where.id !== undefined && t.id !== where.id) return true;
        if (where.type !== undefined && t.type !== where.type) return true;
        const idf = where.identifier;
        if (typeof idf === "string" && t.identifier !== idf) return true;
        if (idf && typeof idf === "object" && !t.identifier.startsWith(idf.startsWith)) return true;
        return false; // matched → drop
      });
      return { count: before - tokens.length };
    },
  },

  // Interactive-transaction shim with real rollback: snapshot both tables, run
  // the callback, and restore them if it throws — so tests can assert that a
  // failed create/update rolls back a consumed code (single-use preserved).
  $transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
    const uSnap = users.map((u) => ({ ...u }));
    const tSnap = tokens.map((t) => ({ ...t }));
    try {
      return await fn(prisma);
    } catch (e) {
      users = uSnap;
      tokens = tSnap;
      throw e;
    }
  },
};

// ── Test-only helpers (not part of the real @/lib/db surface) ──
export function reset() {
  users = [];
  tokens = [];
  seq = 0;
  failCreate = false;
  failUpdate = false;
}
/** Make the next `user.create` throw a generic (non-P2002) error, once. */
export function failNextCreate() {
  failCreate = true;
}
/** Make the next `user.update` throw a generic (non-P2002) error, once. */
export function failNextUpdate() {
  failUpdate = true;
}
export function allUsers() {
  return users;
}
export function seedUser(u: Partial<User> & { email: string }): User {
  const user: User = {
    id: u.id ?? nextId("user"),
    name: "Test",
    role: "CUSTOMER",
    isEmployee: false,
    isPrimaryAdmin: false,
    isGuest: false,
    emailVerified: new Date(),
    deactivatedAt: null,
    phone: null,
    image: null,
    passwordHash: "!google",
    ...u,
  };
  users.push(user);
  return user;
}
export function allTokens() {
  return tokens;
}
export function findUserByEmail(email: string) {
  return users.find((u) => u.email === email) ?? null;
}
