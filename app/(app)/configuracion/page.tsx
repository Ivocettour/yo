import Link from "next/link";
import { ChevronRight, CreditCard, Database, LogOut, Tags, UserCircle } from "lucide-react";
import { requireUser } from "@/lib/auth/current-user";
import { logout } from "@/lib/actions/auth";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ThemeToggle } from "@/components/settings/theme-toggle";

export const metadata = { title: "Configuración" };

const SECTIONS = [
  { href: "/configuracion/categorias", label: "Categorías", description: "Crear, editar y desactivar", icon: Tags },
  { href: "/configuracion/metodos-pago", label: "Métodos de pago", description: "Efectivo, tarjetas, billeteras", icon: CreditCard },
  { href: "/configuracion/datos", label: "Datos", description: "Exportar e importar backups", icon: Database },
  { href: "/configuracion/cuenta", label: "Cuenta", description: "Nombre, zona horaria y contraseña", icon: UserCircle },
];

export default async function SettingsPage() {
  const user = await requireUser();
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 animate-in">
      <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>

      <Card>
        <CardBody className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-lg font-bold text-primary">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{user.name}</p>
            <p className="truncate text-sm text-muted">{user.email}</p>
          </div>
        </CardBody>
      </Card>

      <Card>
        <ul className="divide-y divide-border/60">
          {SECTIONS.map((s) => (
            <li key={s.href}>
              <Link href={s.href} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-primary">
                  <s.icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{s.label}</span>
                  <span className="block text-sm text-muted">{s.description}</span>
                </span>
                <ChevronRight className="h-5 w-5 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardHeader title="Tema" subtitle="Se guarda en este dispositivo" />
        <CardBody className="pt-3">
          <ThemeToggle />
        </CardBody>
      </Card>

      <form action={logout}>
        <button
          type="submit"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-surface text-[15px] font-semibold text-danger transition hover:bg-danger-soft"
        >
          <LogOut className="h-4 w-4" /> Cerrar sesión
        </button>
      </form>
    </div>
  );
}
