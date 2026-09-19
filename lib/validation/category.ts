import { z } from "zod";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export const categorySchema = z.object({
  name: z.string().trim().min(1, { message: "Ingresá un nombre." }).max(40, { message: "Máximo 40 caracteres." }),
  icon: z.string().trim().min(1, { message: "Elegí un ícono." }).max(8),
  color: z.string().trim().regex(HEX_COLOR, { message: "Color inválido." }),
});

export type CategoryInput = z.infer<typeof categorySchema>;

export const paymentMethodSchema = z.object({
  name: z.string().trim().min(1, { message: "Ingresá un nombre." }).max(40, { message: "Máximo 40 caracteres." }),
  icon: z.string().trim().min(1, { message: "Elegí un ícono." }).max(8),
});

export type PaymentMethodInput = z.infer<typeof paymentMethodSchema>;
