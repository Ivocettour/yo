"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-5xl">😕</p>
      <h1 className="text-xl font-semibold">Algo salió mal</h1>
      <p className="max-w-xs text-sm text-muted">No pudimos cargar esta pantalla. Tus datos están a salvo. Probá de nuevo.</p>
      <button type="button" onClick={reset} className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">
        Reintentar
      </button>
    </div>
  );
}
