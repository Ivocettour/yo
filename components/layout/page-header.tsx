import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { type ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  backHref,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  backHref?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-5 flex items-center gap-3">
      {backHref ? (
        <Link
          href={backHref}
          aria-label="Volver"
          className="-ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
      ) : null}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle ? <p className="text-sm text-muted">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
