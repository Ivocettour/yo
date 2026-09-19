import { cn } from "@/lib/utils/cn";

const colors = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

export function Progress({
  value,
  tone = "primary",
  className,
  label,
}: {
  value: number;
  tone?: keyof typeof colors;
  className?: string;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-label={label}
      className={cn("h-2.5 w-full overflow-hidden rounded-full bg-surface-2", className)}
    >
      <div className={cn("h-full rounded-full transition-all duration-500", colors[tone])} style={{ width: `${pct}%` }} />
    </div>
  );
}
