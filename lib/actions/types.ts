import type { FieldErrors } from "@/lib/validation/common";

export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: FieldErrors };

export function fail(error: string, fieldErrors?: FieldErrors): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

export const UNAUTHORIZED_MESSAGE = "Tu sesión expiró. Volvé a iniciar sesión.";
export const GENERIC_ERROR = "Ocurrió un error inesperado. Intentá de nuevo.";
