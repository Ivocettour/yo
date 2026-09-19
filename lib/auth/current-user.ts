import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getSessionUser, type SessionUser } from "./session";

/** Usuario de la sesion actual, cacheado por request. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  try {
    return await getSessionUser();
  } catch {
    return null;
  }
});

/** Exige usuario autenticado. Redirige a /login si no hay sesion. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Para server actions: lanza error en vez de redirigir. */
export async function requireUserForAction(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}
