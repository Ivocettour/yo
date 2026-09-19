"use client";

export function RetryButton() {
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
    >
      Reintentar
    </button>
  );
}
