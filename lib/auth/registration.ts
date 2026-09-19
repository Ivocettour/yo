import "server-only";
import { prisma } from "@/lib/db";

/** Indica si se pueden registrar usuarios: primer usuario siempre, luego solo con ALLOW_REGISTRATION=true. */
export async function registrationAllowed(): Promise<boolean> {
  if (process.env.ALLOW_REGISTRATION === "true") return true;
  const count = await prisma.user.count();
  return count === 0;
}
