import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/session";
import { ProfileForm, PasswordForm } from "@/components/account/SettingsForms";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) return null; // layout already guards; satisfies types

  return (
    <div>
      <h1 className="mb-5 text-2xl font-extrabold tracking-tight text-foreground">Settings</h1>
      <div className="space-y-6">
        <ProfileForm name={user.name ?? ""} phone={user.phone ?? ""} email={user.email ?? ""} />
        <PasswordForm />
      </div>
    </div>
  );
}
