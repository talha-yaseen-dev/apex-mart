import "server-only";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { verifyPassword } from "@/lib/password";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { AUTH_ERRORS } from "@/lib/auth-constants";
import { syncEmployeeDirectory, ensureBootstrapAdmin } from "@/lib/sso";

export { AUTH_ERRORS };

const googleEnabled = Boolean(
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET,
);

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  secret: env.NEXTAUTH_SECRET,
  pages: { signIn: "/signin" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "")
          .trim()
          .toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        // Sliding-window lockout: 5 attempts / 30s per account, plus a looser
        // per-IP ceiling so an attacker can't spray many different accounts
        // from one host (the per-account limit alone wouldn't catch that).
        const ip = await clientIp();
        const [byEmail, byIp] = await Promise.all([
          rateLimit(`signin:${email}`, 5, 30),
          ip === "unknown"
            ? Promise.resolve({ allowed: true, remaining: 1, retryAfter: 0 })
            : rateLimit(`signin-ip:${ip}`, 30, 30),
        ]);
        if (!byEmail.allowed || !byIp.allowed) throw new Error(AUTH_ERRORS.RATE_LIMITED);

        const user = await prisma.user.findUnique({ where: { email } });
        // Constant-ish work whether or not the user exists (no enumeration).
        const ok = user
          ? await verifyPassword(user.passwordHash, password)
          : await verifyPassword("$argon2id$v=19$m=19456,t=2,p=1$x$x", password);
        if (!user || !ok) return null;

        if (user.deactivatedAt) throw new Error(AUTH_ERRORS.DEACTIVATED);
        if (!user.emailVerified) throw new Error(AUTH_ERRORS.EMAIL_NOT_VERIFIED);

        // SSO/SCIM seam: in production the internal directory (isEmployee + role
        // assignments) is reconciled from the identity provider on each sign-in.
        await syncEmployeeDirectory(user.email);
        // First-admin bootstrap: promote the configured address if needed, and
        // reflect the promotion in this session immediately.
        const promoted = await ensureBootstrapAdmin(user.email);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: promoted?.role ?? user.role,
          isEmployee: promoted?.isEmployee ?? user.isEmployee,
        };
      },
    }),
    ...(googleEnabled
      ? [
          GoogleProvider({
            clientId: env.GOOGLE_CLIENT_ID!,
            clientSecret: env.GOOGLE_CLIENT_SECRET!,
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.role = (user as { role?: Role }).role ?? Role.CUSTOMER;
        token.isEmployee = (user as { isEmployee?: boolean }).isEmployee ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid as string;
        session.user.role = token.role as Role;
        session.user.isEmployee = Boolean(token.isEmployee);
      }
      return session;
    },
  },
};
