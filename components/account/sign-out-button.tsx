"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="h-9 rounded-lg border bg-card px-3 text-[12.5px] font-semibold text-foreground/80 hover:border-primary"
    >
      Sign out
    </button>
  );
}
