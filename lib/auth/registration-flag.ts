/**
 * Lectura de ALLOW_REGISTRATION compartida entre el proxy (edge, sin base de datos)
 * y el servidor. Tolera comillas, espacios y mayusculas: en algunos paneles la
 * variable termina guardada como `"true"` o ` True `.
 */
export function isRegistrationFlagEnabled(raw: string | undefined = process.env.ALLOW_REGISTRATION): boolean {
  if (!raw) return false;
  const value = raw.trim().replace(/^['"]|['"]$/g, "").toLowerCase();
  return value === "true" || value === "1" || value === "yes";
}
