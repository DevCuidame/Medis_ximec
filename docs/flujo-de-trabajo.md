# Flujo de trabajo — MedisXime

> Volver al [índice maestro](../CLAUDE.md).

---

## Cómo correr el proyecto

```bash
# 1. Instalar dependencias
pnpm install

# 2. Configurar env
cp apps/backend/.env.example apps/backend/.env
# editar .env con DATABASE_URL y JWT_SECRET

# 3. Correr migraciones
pnpm -F @medisxime/backend migrate

# 4. Levantar dev (backend puerto 3009 + frontend puerto 5173)
pnpm dev

# Solo backend
pnpm build:backend && node apps/backend/dist/index.js

# Solo frontend
cd medisxime-landing && pnpm dev
```

**Gestión de monorepo**: pnpm workspaces + Turborepo
- `pnpm dev` — lanza backend y frontend en paralelo
- `pnpm build` — build de todos los paquetes
- `pnpm -F @medisxime/backend migrate` — corre las migraciones SQL (ver detalle en [arquitectura.md](arquitectura.md#base-de-datos-appsbackendmigrations))

---

## Variables de entorno (apps/backend/.env)

| Variable        | Requerida | Default          |
|-----------------|-----------|------------------|
| `DATABASE_URL`  | ✅        | —                |
| `JWT_SECRET`    | ✅        | —                |
| `PORT`          | —         | 3007 (dev: 3009) |
| `NODE_ENV`      | —         | development      |
| `CORS_ORIGIN`   | —         | http://localhost:5173 |
| `EMAIL_HOST`    | —         | smtp.gmail.com   |
| `EMAIL_PORT`    | —         | 465              |
| `EMAIL_USER`    | —         | —                |
| `EMAIL_PASSWORD`| —         | —                |
| `ADMIN_EMAIL`   | —         | = EMAIL_USER     |
| `SISPRO_SECRET` | —         | = JWT_SECRET (fallback) — cifra credenciales SISPRO |

> ⚠️ `SISPRO_SECRET` **no debe rotarse** una vez existan credenciales SISPRO guardadas.
> Ver [errores-conocidos.md](errores-conocidos.md) para el detalle del riesgo.

---

## Despliegue (VM de producción)

Scripts en `scripts/` (VM `cuidame-app`, proyecto GCP `esmart-health`):

| Script | Uso |
|--------|-----|
| `scripts/deploy-medisxime.ps1` | Despliegue completo — versionado en git |
| `scripts/deploy-rapido.ps1` | Sube solo los archivos clave modificados, reconstruye frontend y reinicia backend — ignorado por git (contiene rutas del servidor) |
| `scripts/diagnostico-vm.ps1` | Diagnóstico rápido de logs/estado en el VM — ignorado por git (contiene credenciales de BD) |

`deploy-rapido.ps1` y `diagnostico-vm.ps1` no se suben al repo porque tienen datos de
conexión a la base de datos embebidos; ver los riesgos y advertencias asociados en
[errores-conocidos.md](errores-conocidos.md#riesgos-operativos).

### `deploy-medisxime.ps1 -Target` (deploys parciales, más rápidos)

El frontend se compila en la máquina local (no en la VM) y solo el `dist/`
compilado viaja en el ZIP — el `-Target` controla qué más se toca:

| `-Target` | Qué hace | Qué se salta |
|-----------|----------|----------------|
| `all` (default) | Deploy completo: build local + dependencias del sistema + PostgreSQL + backend + migraciones + nginx + Certbot + PM2 | — |
| `frontend` | Solo compila y sube `medisxime-landing/dist` (paquete chico, swap atómico en la VM) | Todo lo demás — no toca backend, DB, nginx ni PM2 |
| `backend` | Backend (`pnpm install` filtrado + migraciones) + reinicio de PM2 | Build de frontend, dependencias del sistema, PostgreSQL, nginx, Certbot |

`-Target frontend`/`-Target backend` asumen que la VM ya fue provisionada al
menos una vez con `-Target all` — el primer deploy a una VM nueva, o
cualquier cambio de infraestructura (nginx, Certbot, versión de Node/Postgres),
debe usar `-Target all`.
