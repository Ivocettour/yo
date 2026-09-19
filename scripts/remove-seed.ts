/** Elimina el usuario demo creado por `npm run db:seed` junto con todos sus datos. */
import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const SEED_EMAIL = process.env.SEED_EMAIL ?? "demo@gastos.local";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
  const res = await prisma.user.deleteMany({ where: { email: SEED_EMAIL } });
  console.log(res.count ? `Usuario demo ${SEED_EMAIL} y sus datos eliminados.` : `No existe el usuario demo ${SEED_EMAIL}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
