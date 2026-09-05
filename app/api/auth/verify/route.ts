import { NextResponse, type NextRequest } from "next/server";
import { TokenType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { consumeToken } from "@/lib/tokens";

/**
 * Legacy email-verification link target (older emails point here). Consumes the
 * single-use token, activates the account, and redirects to the /verify-email
 * page which renders the result. New emails link straight to /verify-email.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const dest = new URL("/verify-email", req.nextUrl.origin);

  const email = token ? await consumeToken(token, TokenType.EMAIL_VERIFY) : null;
  if (!email) {
    dest.searchParams.set("status", "invalid");
    return NextResponse.redirect(dest);
  }

  await prisma.user
    .update({ where: { email }, data: { emailVerified: new Date() } })
    .catch(() => {});

  dest.searchParams.set("status", "success");
  return NextResponse.redirect(dest);
}
