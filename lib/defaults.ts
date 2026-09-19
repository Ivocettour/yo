/** Categorias y metodos de pago que se crean para cada usuario nuevo. */

export interface DefaultCategory {
  name: string;
  key: string;
  icon: string;
  color: string;
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { name: "Uber", key: "uber", icon: "🚗", color: "#111827" },
  { name: "Transporte", key: "transport", icon: "🚌", color: "#0ea5e9" },
  { name: "Comida", key: "food", icon: "🍔", color: "#f97316" },
  { name: "Supermercado", key: "groceries", icon: "🛒", color: "#22c55e" },
  { name: "Entretenimiento", key: "entertainment", icon: "🎬", color: "#a855f7" },
  { name: "Compras", key: "shopping", icon: "🛍️", color: "#ec4899" },
  { name: "Suscripciones", key: "subscriptions", icon: "📺", color: "#6366f1" },
  { name: "Educación", key: "education", icon: "📚", color: "#eab308" },
  { name: "Salud", key: "health", icon: "💊", color: "#ef4444" },
  { name: "Hogar", key: "home", icon: "🏠", color: "#14b8a6" },
  { name: "Servicios", key: "services", icon: "💡", color: "#f59e0b" },
  { name: "Otros", key: "other", icon: "📦", color: "#64748b" },
];

export interface DefaultPaymentMethod {
  name: string;
  key: string;
  icon: string;
}

export const DEFAULT_PAYMENT_METHODS: DefaultPaymentMethod[] = [
  { name: "Efectivo", key: "cash", icon: "💵" },
  { name: "Débito", key: "debit", icon: "💳" },
  { name: "Crédito", key: "credit", icon: "🏦" },
  { name: "Transferencia", key: "transfer", icon: "🔁" },
  { name: "Mercado Pago", key: "mercadopago", icon: "📱" },
  { name: "Otro", key: "other", icon: "❔" },
];

export const CREDIT_PAYMENT_KEY = "credit";

/** Iconos sugeridos para el selector de categorias. */
export const CATEGORY_ICON_OPTIONS = [
  "🚗", "🚌", "🚇", "✈️", "⛽", "🍔", "🍕", "☕", "🍺", "🛒", "🎬", "🎮", "🎵", "🛍️", "👕", "📺",
  "📚", "🎓", "💊", "🏥", "🏠", "🔧", "💡", "📱", "💻", "🐶", "🎁", "💇", "🏋️", "⚽", "🧾", "📦",
];

export const PAYMENT_ICON_OPTIONS = ["💵", "💳", "🏦", "🔁", "📱", "🪙", "🧾", "❔"];

export const CATEGORY_COLOR_OPTIONS = [
  "#111827", "#0ea5e9", "#f97316", "#22c55e", "#a855f7", "#ec4899", "#6366f1", "#eab308",
  "#ef4444", "#14b8a6", "#f59e0b", "#64748b", "#84cc16", "#06b6d4", "#d946ef", "#78716c",
];
