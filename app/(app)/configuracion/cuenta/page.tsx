import { requireUser } from "@/lib/auth/current-user";
import { PageHeader } from "@/components/layout/page-header";
import { PasswordForm, ProfileForm } from "@/components/settings/account-forms";

export const metadata = { title: "Cuenta" };

export default async function AccountSettingsPage() {
  const user = await requireUser();
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 animate-in">
      <PageHeader title="Cuenta" backHref="/configuracion" />
      <ProfileForm name={user.name} email={user.email} timezone={user.timezone} />
      <PasswordForm />
    </div>
  );
}
