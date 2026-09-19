import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { registrationAllowed } from "@/lib/auth/registration";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata = { title: "Crear cuenta" };
// Depende del estado de la base (cantidad de usuarios): nunca prerenderizar.
export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  if (!(await registrationAllowed())) redirect("/login");
  const users = await prisma.user.count();
  return <RegisterForm firstUser={users === 0} />;
}
