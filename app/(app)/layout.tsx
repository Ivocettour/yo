import { requireUser } from "@/lib/auth/current-user";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  return <AppShell user={{ name: user.name, email: user.email }}>{children}</AppShell>;
}
