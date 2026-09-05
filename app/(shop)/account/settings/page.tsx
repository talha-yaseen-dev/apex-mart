import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { ProfileForm, PasswordForm, SetPasswordForm } from "@/components/account/SettingsForms";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) return null; // layout already guards; satisfies types

  // A real argon2 hash means the account has a usable password; a sentinel
  // ("!google"/"!guest") means it was created via Google and has none yet.
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  const hasPassword = Boolean(dbUser?.passwordHash?.startsWith("$argon2"));

  return (
    <div>
      <h1 className="mb-5 text-2xl font-extrabold tracking-tight text-foreground">Settings</h1>
      <div className="space-y-6">
        <ProfileForm name={user.name ?? ""} phone={user.phone ?? ""} email={user.email ?? ""} />
        {hasPassword ? <PasswordForm /> : <SetPasswordForm />}
      </div>
    </div>
  );
}
