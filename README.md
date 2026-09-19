# Mis Gastos

Aplicación web personal para registrar y analizar gastos, pensada para usarse desde el celular (PWA instalable) y también desde tablet o PC. Los datos se guardan en PostgreSQL en la nube, protegidos con login.

**Stack:** Next.js 16 (App Router, Server Actions) · TypeScript · Tailwind CSS 4 · Prisma 7 · PostgreSQL · Recharts · Zod · Vitest.

## Funcionalidades

- Registro rápido de gastos y **carga rápida de Uber** (monto, origen → destino, método de pago).
- Lista de gastos con búsqueda, filtros (fecha, categoría, método de pago, monto) y carga progresiva.
- Detalle, edición y eliminación con confirmación.
- Dashboard con período (hoy / semana / mes / mes anterior / personalizado), resumen de Uber y comparación contra el mes anterior.
- Estadísticas: donut por categoría, evolución diaria/semanal/mensual, métodos de pago y estadísticas de Uber.
- Calendario financiero con gasto por día e historial mensual.
- Presupuesto general y por categoría, por mes, con advertencias al superarlo.
- Compras en cuotas: cada cuota es un gasto mensual (las estadísticas nunca duplican el total).
- Categorías y métodos de pago configurables; tema claro/oscuro/sistema.
- Exportación (JSON completo / CSV) e importación de backups con validación y detección de duplicados.
- Autenticación con email + contraseña, sesiones en base de datos y rutas protegidas.

## Requisitos

- Node.js 20.9 o superior (probado con Node 24).
- Una base PostgreSQL. Para desarrollo local no hace falta instalar nada: `npm run db:dev` levanta una instancia local de Prisma Postgres.

## Instalación

```bash
npm install
```

`npm install` ejecuta `prisma generate` automáticamente (postinstall).

## Variables de entorno

Copiá `.env.example` a `.env` y completá:

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `DATABASE_URL` | Sí | Conexión PostgreSQL usada por la app. En Neon usar la URL *pooled*. |
| `DIRECT_URL` | No | Conexión directa (sin pooler) para migraciones. Si falta, se usa `DATABASE_URL`. |
| `SESSION_SECRET` | Sí | Secreto largo y aleatorio para firmar las sesiones. |
| `ALLOW_REGISTRATION` | No | `"true"` permite crear cuentas desde `/register`. Por defecto solo se puede crear el **primer** usuario. |
| `DEFAULT_TIMEZONE` | No | Zona horaria de los usuarios nuevos (default `America/Argentina/Buenos_Aires`). |
| `SEED_EMAIL` / `SEED_PASSWORD` | No | Credenciales del usuario demo del seed. |

Generar un secreto:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Nunca subas `.env` ni `.env.local` al repositorio (ya están en `.gitignore`).

## Base de datos

Levantar la base local (imprime la `DATABASE_URL` a usar en `.env`):

```bash
npm run db:dev
```

Aplicar migraciones:

```bash
npm run db:migrate
```

Otros comandos: `npm run db:deploy` (aplica migraciones sin generar nuevas, para producción), `npm run db:studio` (explorador visual), `npm run db:reset` (borra y recrea la base local).

## Desarrollo

```bash
npm run dev
```

Abrí http://localhost:3000.

## Autenticación y usuario inicial

Hay dos formas de crear tu usuario:

1. **Desde la app:** si la base no tiene usuarios, `/register` permite crear el primero (después queda deshabilitado salvo que `ALLOW_REGISTRATION="true"`).
2. **Por script:**

```bash
npm run user:create -- --email vos@mail.com --name "Tu Nombre" --password "una-clave-segura"
```

Si el email ya existe, el script actualiza la contraseña y cierra sus sesiones.

Cómo funciona: la contraseña se guarda con bcrypt; al iniciar sesión se crea un registro `Session` (solo se guarda el HMAC del token) y una cookie `httpOnly` de 30 días. `proxy.ts` redirige a `/login` sin cookie; además cada página y cada Server Action verifican la sesión contra la base y filtran **todo** por `userId`.

## Datos de prueba (seed)

```bash
npm run db:seed      # crea demo@gastos.local / demo1234 con ~3 meses de gastos ficticios
npm run seed:remove  # elimina el usuario demo y todos sus datos
```

El seed crea un usuario separado: no mezcla datos con tu cuenta. No lo ejecutes en producción salvo que quieras el usuario demo (podés borrarlo con `seed:remove`).

## Tests, lint y build

```bash
npm run lint
npm run typecheck
npm test          # unitarios + integración (usa DATABASE_URL de .env)
npm run build
npm start         # producción local en http://localhost:3000
```

Los tests de integración crean usuarios `test-*@test.local` y los eliminan al terminar.

## Deploy en Vercel

1. **Subí el proyecto a GitHub** (sin `.env`).
2. **Base de datos PostgreSQL.** Opciones compatibles con Vercel:
   - *Neon* (Marketplace de Vercel → Storage → Neon): copiá la connection string **pooled** como `DATABASE_URL` y la **unpooled/direct** como `DIRECT_URL`.
   - *Prisma Postgres* o *Supabase*: usá la URL de conexión directa TCP (`postgres://...`) como `DATABASE_URL`.
3. **Creá el proyecto en Vercel** → *Add New Project* → importá el repositorio. Framework: Next.js (se detecta solo).
4. **Variables de entorno** (Settings → Environment Variables, para Production y Preview):
   - `DATABASE_URL`
   - `DIRECT_URL` (si aplica)
   - `SESSION_SECRET` (uno distinto para Production y Preview)
   - `ALLOW_REGISTRATION` = `false`
   - `DEFAULT_TIMEZONE` = `America/Argentina/Buenos_Aires`
5. **Migraciones.** El script `vercel-build` (`prisma generate && prisma migrate deploy && next build`) aplica las migraciones pendientes en cada deploy. Alternativa manual desde tu PC:
   ```bash
   DATABASE_URL="postgres://..." npm run db:deploy
   ```
6. **Deploy.** Vercel construye y publica. Los *Preview deployments* de cada rama usan las variables marcadas como Preview (ideal apuntarlas a otra base).
7. **Verificar producción.**
   - Abrí la URL → tenés que ver `/login`.
   - Creá tu usuario: entrá a `/register` (funciona solo si la base está vacía) o corré `npm run user:create` apuntando `DATABASE_URL` a producción.
   - Registrá un gasto, recargá la página y comprobá que sigue; cerrá sesión y volvé a entrar.
   - En el celular: abrí la URL en Chrome/Safari → "Agregar a pantalla de inicio" para instalarla como app.

## Estructura del proyecto

```
app/                 Rutas (App Router): (auth)/login, (auth)/register, (app)/… , api/export
components/          UI (ui/), layout, gastos, dashboard, estadísticas, presupuestos, configuración
lib/actions/         Server Actions (mutaciones, validadas y acotadas al usuario)
lib/queries/         Lecturas con Prisma (listado, dashboard, estadísticas, presupuestos)
lib/auth/            Sesiones, contraseñas, rate limit, bootstrap de usuario
lib/backup/          Exportación/importación JSON y CSV
lib/utils/           Dinero (ARS), fechas, períodos, cálculos de estadísticas
lib/validation/      Esquemas Zod (frontend y backend)
prisma/              schema.prisma, migraciones y seed
scripts/             create-user, remove-seed
tests/               Vitest (unit + integration)
public/sw.js         Service worker mínimo (solo assets estáticos + página offline)
proxy.ts             Protección de rutas
```

## Modelo de datos

- `User` — email, nombre, hash de contraseña, zona horaria.
- `Session` — sesiones activas (hash del token, expiración).
- `Category` — categorías por usuario (icono, color, activa; `key` estable para "uber").
- `PaymentMethod` — métodos de pago por usuario (`key` estable para "credit", que habilita cuotas).
- `Expense` — gasto: monto, fecha, hora, descripción, notas, origen/destino, cuota N de M, plan.
- `InstallmentPlan` — compra financiada: total, cantidad de cuotas, fecha de inicio.
- `Budget` — presupuesto mensual general (`categoryId = null`) o por categoría.

## Notas

- Las fechas se manejan como fechas civiles (`YYYY-MM-DD`) y "hoy" se calcula con la zona horaria del usuario, así el servidor en UTC de Vercel no corre los días.
- El service worker no cachea datos: la app requiere conexión para ver y registrar gastos, garantizando que nunca muestre información financiera desactualizada.
- El limitador de intentos de login es en memoria (por instancia). Para un uso multiusuario a escala, reemplazarlo por Redis/Upstash.
