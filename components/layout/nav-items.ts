import { BarChart3, Home, PiggyBank, ReceiptText, Settings, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/gastos", label: "Gastos", icon: ReceiptText },
  { href: "/estadisticas", label: "Estadísticas", icon: BarChart3 },
  { href: "/presupuesto", label: "Presupuesto", icon: PiggyBank },
  { href: "/configuracion", label: "Configuración", icon: Settings },
];

export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
