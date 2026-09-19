import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-5xl">🔍</p>
      <h1 className="text-xl font-semibold">No encontramos esa página</h1>
      <p className="max-w-xs text-sm text-muted">Puede que el gasto haya sido eliminado o que el enlace sea incorrecto.</p>
      <Link href="/" className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">
        Ir al inicio
      </Link>
    </div>
  );
}
