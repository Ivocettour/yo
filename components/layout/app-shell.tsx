"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Car, Plus, Wallet } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Sheet } from "@/components/ui/sheet";
import { NAV_ITEMS, isActivePath } from "./nav-items";

interface AppShellProps {
  user: { name: string; email: string };
  children: ReactNode;
}

export function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname();
  const [quickOpen, setQuickOpen] = useState(false);

  return (
    <div className="min-h-dvh lg:flex">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:border-r lg:border-border lg:bg-surface lg:sticky lg:top-0 lg:h-dvh">
        <div className="flex items-center gap-3 px-6 py-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <p className="text-base font-bold leading-tight">Mis Gastos</p>
            <p className="text-xs text-muted">Finanzas personales</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3" aria-label="Principal">
          {NAV_ITEMS.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
                  active ? "bg-primary-soft text-primary" : "text-muted hover:bg-surface-2 hover:text-foreground",
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
          <div className="mt-4 flex flex-col gap-2 px-1">
            <Link
              href="/gastos/nuevo"
              className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary-hover"
            >
              <Plus className="h-5 w-5" /> Nuevo gasto
            </Link>
            <Link
              href="/gastos/nuevo/uber"
              className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-uber text-sm font-semibold text-background shadow-sm transition hover:opacity-90"
            >
              <Car className="h-5 w-5" /> Uber
            </Link>
          </div>
        </nav>
        <div className="border-t border-border px-6 py-4">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-muted">{user.email}</p>
        </div>
      </aside>

      {/* Contenido */}
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-[calc(var(--nav-height)+var(--safe-bottom)+1.5rem)] pt-[calc(var(--safe-top)+1rem)] sm:px-6 lg:px-8 lg:pb-10 lg:pt-8">
          {children}
        </main>
      </div>

      {/* Bottom nav mobile */}
      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80 lg:hidden pb-safe"
      >
        <ul className="grid h-[var(--nav-height)] grid-cols-5 items-stretch">
          {NAV_ITEMS.map((item, i) => {
            const active = isActivePath(pathname, item.href);
            const isMiddle = i === 2;
            return (
              <li key={item.href} className="relative flex items-stretch justify-center">
                {isMiddle ? (
                  <button
                    type="button"
                    onClick={() => setQuickOpen(true)}
                    aria-label="Agregar gasto"
                    className="absolute -top-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-float transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <Plus className="h-7 w-7" strokeWidth={2.5} />
                  </button>
                ) : null}
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex w-full flex-col items-center justify-end gap-1 pb-2 pt-2 text-[11px] font-medium transition-colors",
                    isMiddle && "pt-8",
                    active ? "text-primary" : "text-muted",
                  )}
                >
                  {!isMiddle ? <item.icon className={cn("h-6 w-6", active && "fill-primary/15")} /> : null}
                  <span className="truncate">{isMiddle ? item.label.split(" ")[0] : item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <QuickAddSheet open={quickOpen} onClose={() => setQuickOpen(false)} />
    </div>
  );
}

function QuickAddSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const go = (href: string) => {
    onClose();
    router.push(href);
  };
  return (
    <Sheet open={open} onClose={onClose} title="¿Qué querés registrar?" size="sm">
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => go("/gastos/nuevo/uber")}
          className="flex flex-col items-center gap-2 rounded-3xl bg-uber px-4 py-6 text-background transition active:scale-[0.98]"
        >
          <Car className="h-8 w-8" />
          <span className="text-base font-semibold">Uber</span>
          <span className="text-xs opacity-80">Viaje rápido</span>
        </button>
        <button
          type="button"
          onClick={() => go("/gastos/nuevo")}
          className="flex flex-col items-center gap-2 rounded-3xl bg-primary px-4 py-6 text-primary-foreground transition active:scale-[0.98]"
        >
          <Plus className="h-8 w-8" />
          <span className="text-base font-semibold">Gasto</span>
          <span className="text-xs opacity-80">Cualquier categoría</span>
        </button>
      </div>
    </Sheet>
  );
}
