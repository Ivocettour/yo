import { Wallet } from "lucide-react";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10 pt-safe pb-safe">
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-float">
          <Wallet className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold">Mis Gastos</h1>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
