import { NextResponse, type NextRequest } from "next/server";
import { TokenType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { consumeToken } from "@/lib/tokens";

/**
 * Email verification link target. Consumes the single-use token, activates the
 * account, and redirects into the sign-in screen with a status flag.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const signin = new URL("/signin", req.nextUrl.origin);

  if (!token) {
    signin.searchParams.set("error", "verify");
    return NextResponse.redirect(signin);
  }

  const email = await consumeToken(token, TokenType.EMAIL_VERIFY);
  if (!email) {
    signin.searchParams.set("error", "verify");
    return NextResponse.redirect(signin);
  }

  await prisma.user.update({
    where: { email },
    data: { emailVerified: new Date() },
  });

  signin.searchParams.set("verified", "1");
  return NextResponse.redirect(signin);
}
