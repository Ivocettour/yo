import { WifiOff } from "lucide-react";
import { RetryButton } from "@/components/layout/retry-button";

export const metadata = { title: "Sin conexión" };

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <WifiOff className="h-12 w-12 text-muted" />
      <h1 className="text-xl font-semibold">Sin conexión</h1>
      <p className="max-w-xs text-sm text-muted">
        Necesitás conexión a internet para ver y registrar gastos. Tus datos están guardados de forma segura en la nube.
      </p>
      <RetryButton />
    </div>
  );
}
