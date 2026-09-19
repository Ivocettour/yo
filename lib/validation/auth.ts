import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email({ message: "Ingresá un email válido." }).max(200);

export const passwordSchema = z
  .string()
  .min(8, { message: "La contraseña debe tener al menos 8 caracteres." })
  .max(128, { message: "La contraseña es demasiado larga." });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { message: "Ingresá tu contraseña." }).max(128),
});

export const registerSchema = z.object({
  name: z.string().trim().min(1, { message: "Ingresá tu nombre." }).max(80),
  email: emailSchema,
  password: passwordSchema,
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { message: "Ingresá tu contraseña actual." }),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

export const profileSchema = z.object({
  name: z.string().trim().min(1, { message: "Ingresá tu nombre." }).max(80),
  timezone: z.string().trim().min(1).max(64),
});
