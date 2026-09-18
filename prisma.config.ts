import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // DIRECT_URL (conexión directa, sin pooler) se usa para migraciones si existe;
    // si no, se usa DATABASE_URL.
    url: process.env.DIRECT_URL ?? env("DATABASE_URL"),
  },
});
