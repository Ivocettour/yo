import { registrationAllowed } from "@/lib/auth/registration";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = { title: "Iniciar sesión" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const rawNext = Array.isArray(params.next) ? params.next[0] : params.next;
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : undefined;
  const canRegister = await registrationAllowed().catch(() => false);
  return <LoginForm next={next} canRegister={canRegister} />;
}
