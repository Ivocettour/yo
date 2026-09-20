import "dotenv/config";
import { defineConfig } from "prisma/config";

// DIRECT_URL (conexion directa, sin pooler) se usa para migraciones si existe;
// si no, DATABASE_URL. `prisma generate` no necesita conexion, asi que no
// fallamos si la variable falta (por ejemplo en `npm install` sin .env):
// solo `migrate`/`db seed` la requieren y avisan claramente.
const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url && process.argv.some((a) => /^(migrate|db|studio)$/.test(a))) {
  throw new Error("Falta la variable de entorno DATABASE_URL (o DIRECT_URL).");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: url ?? "postgresql://localhost:5432/database_url_no_configurada",
  },
});
