# Código de Prestador en Sedes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Campo obligatorio "Código de Prestador" (REPS, 8–12 dígitos) en las sedes: DB, API y formulario, visible en la tarjeta del listado.

**Architecture:** Migración 018 agrega `provider_code` (nullable) a `locations`. El controlador valida la obligatoriedad (400) en POST y, si viene en el body, en PATCH. El schema Zod del formulario lo exige siempre, de modo que las sedes viejas deben completarlo al editarse. La tarjeta del listado lo muestra.

**Tech Stack:** Express + pg, node:test vía tsx; React 19 + React Hook Form + Zod.

**Spec:** `docs/superpowers/specs/2026-07-15-sede-codigo-prestador-design.md`

## Global Constraints

- Formato: `/^\d{8,12}$/`. Mensaje de error exacto (backend y frontend): `"Código de prestador requerido (8 a 12 dígitos)."` (en Zod sin punto final: `"Código de prestador requerido (8 a 12 dígitos)"`).
- Columna DB **nullable** (sedes existentes siguen válidas; NO se inventan códigos).
- `PATCH /api/locations/:id` sin `providerCode` en el body NO altera el valor guardado.
- Respuestas API: `{ success: true, data: {...} }` / `{ success: false, error: 'mensaje' }`.
- Textos en español formal.

## Ejecución en paralelo

- **Task 1 (backend)** y **Task 2 (frontend)** son independientes (archivos disjuntos) — paralelizables en worktrees.
- Task 3 (verificación e2e) al final con todo integrado.

---

### Task 1: Backend — migración, repositorio, validación en controlador

**Files:**
- Create: `apps/backend/migrations/018_location_provider_code.sql`
- Modify: `apps/backend/src/repositories/location.repository.ts`
- Modify: `apps/backend/src/controllers/location.controller.ts`
- Test: `apps/backend/src/controllers/location.controller.test.ts`

**Interfaces:**
- Consumes: nada nuevo.
- Produces (contrato que consume el frontend): `LocationPublic` gana `providerCode?: string | null` y viaja en `GET /api/locations` (campo `providerCode`). `POST /api/locations` exige `providerCode` con 8–12 dígitos → si falta/es inválido responde 400 `{ success: false, error: "Código de prestador requerido (8 a 12 dígitos)." }`. `PATCH /api/locations/:id` valida `providerCode` solo si viene en el body.

- [ ] **Step 1: Crear la migración**

`apps/backend/migrations/018_location_provider_code.sql`:

```sql
-- ============================================================
-- Migration 018: Código de Prestador (REPS) en sedes
-- ============================================================

ALTER TABLE locations ADD COLUMN IF NOT EXISTS provider_code VARCHAR(20);
```

- [ ] **Step 2: Correr la migración**

Run: `pnpm -F @medisxime/backend migrate`
Expected: termina sin error. (Si no hay DB accesible, continuar y reportarlo como concern.)

- [ ] **Step 3: Escribir el test que falla**

`apps/backend/src/controllers/location.controller.test.ts`:

```ts
import { test, beforeEach } from 'node:test'
import assert from 'node:assert'

process.env.DATABASE_URL ||= 'postgres://test:test@localhost:5432/test'
process.env.JWT_SECRET ||= 'clave-de-prueba'

const { createLocation, updateLocation } = await import('./location.controller.js')
const { LocationRepository } = await import('../repositories/location.repository.js')
const { OperatingHoursRepository } = await import('../repositories/services.repository.js')

function fakeRes() {
  const res: any = { statusCode: 200, body: null }
  res.status = (c: number) => { res.statusCode = c; return res }
  res.json = (b: unknown) => { res.body = b; return res }
  return res
}

beforeEach(() => {
  ;(LocationRepository as any).create = async (d: any) => ({ id: 'loc-1', ...d, isActive: true })
  ;(LocationRepository as any).update = async (_id: string, d: any) => ({ id: 'loc-1', name: 'Sede', address: 'Calle 1', city: 'Bogotá', ...d, isActive: true })
  ;(OperatingHoursRepository as any).upsertMany = async () => {}
})

const base = { name: 'Sede Test', address: 'Calle 1 # 2-3', city: 'Bogotá' }

test('POST sin providerCode responde 400 con el mensaje exacto', async () => {
  const res = fakeRes()
  await createLocation({ body: { ...base } } as any, res)
  assert.strictEqual(res.statusCode, 400)
  assert.strictEqual(res.body.error, 'Código de prestador requerido (8 a 12 dígitos).')
})

test('POST con providerCode inválido (letras / corto / largo) responde 400', async () => {
  for (const bad of ['ABC12345', '1234567', '1234567890123']) {
    const res = fakeRes()
    await createLocation({ body: { ...base, providerCode: bad } } as any, res)
    assert.strictEqual(res.statusCode, 400, `debió rechazar "${bad}"`)
  }
})

test('POST con providerCode válido responde 201 y lo persiste', async () => {
  const res = fakeRes()
  await createLocation({ body: { ...base, providerCode: '0500123456' } } as any, res)
  assert.strictEqual(res.statusCode, 201)
  assert.strictEqual(res.body.data.location.providerCode, '0500123456')
})

test('PATCH con providerCode inválido responde 400', async () => {
  const res = fakeRes()
  await updateLocation({ params: { id: 'loc-1' }, body: { providerCode: 'xx' } } as any, res)
  assert.strictEqual(res.statusCode, 400)
})

test('PATCH sin providerCode no valida ni toca el campo (200)', async () => {
  const res = fakeRes()
  await updateLocation({ params: { id: 'loc-1' }, body: { isActive: false } } as any, res)
  assert.strictEqual(res.statusCode, 200)
})
```

- [ ] **Step 4: Verificar que falla**

Run (desde `apps/backend/`): `npx tsx --test src/controllers/location.controller.test.ts`
Expected: FAIL — el controlador actual no valida (los tests de 400 fallan).

- [ ] **Step 5: Repositorio — columna nueva**

En `apps/backend/src/repositories/location.repository.ts`:

`LocationPublic` — agregar tras `email?`:

```ts
  providerCode?: string | null;
```

`findAll` — el SELECT queda:

```ts
      `SELECT id, name, address, city, phone, email, provider_code AS "providerCode", is_active AS "isActive"
       FROM locations
       ORDER BY name`
```

`create` — queda:

```ts
  async create(data: Omit<LocationPublic, 'id' | 'isActive'>): Promise<LocationPublic> {
    const { rows } = await pool.query(
      `INSERT INTO locations (name, address, city, phone, email, provider_code)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, address, city, phone, email, provider_code AS "providerCode", is_active AS "isActive"`,
      [data.name, data.address, data.city, data.phone ?? null, data.email ?? null, data.providerCode ?? null]
    );
    return rows[0];
  },
```

`update` — agregar junto a los demás campos:

```ts
    if (data.providerCode !== undefined) { sets.push(`provider_code = $${i++}`); values.push(data.providerCode); }
```

y el RETURNING del UPDATE queda:

```ts
       RETURNING id, name, address, city, phone, email, provider_code AS "providerCode", is_active AS "isActive"`,
```

- [ ] **Step 6: Controlador — validación**

En `apps/backend/src/controllers/location.controller.ts`, tras los imports:

```ts
const PROVIDER_CODE_RE = /^\d{8,12}$/;
const PROVIDER_CODE_ERROR = 'Código de prestador requerido (8 a 12 dígitos).';
```

`createLocation` — tras `const { operatingHours, ...locationData } = req.body;`:

```ts
    if (!PROVIDER_CODE_RE.test(String(locationData.providerCode ?? ''))) {
      res.status(400).json({ success: false, error: PROVIDER_CODE_ERROR });
      return;
    }
```

`updateLocation` — tras `const { operatingHours, ...locationData } = req.body;`:

```ts
    if (locationData.providerCode !== undefined && !PROVIDER_CODE_RE.test(String(locationData.providerCode))) {
      res.status(400).json({ success: false, error: PROVIDER_CODE_ERROR });
      return;
    }
```

- [ ] **Step 7: Verificar que pasa + build**

Run (desde `apps/backend/`): `npx tsx --test src/controllers/location.controller.test.ts`
Expected: 5 tests PASS.
Run: `pnpm -F @medisxime/backend build`
Expected: tsc sin errores.

- [ ] **Step 8: Commit**

```bash
git add apps/backend/migrations/018_location_provider_code.sql apps/backend/src/repositories/location.repository.ts apps/backend/src/controllers/location.controller.ts apps/backend/src/controllers/location.controller.test.ts
git commit -m "feat(backend): codigo de prestador obligatorio en sedes (migracion 018)"
```

---

### Task 2: Frontend — schema, formulario y tarjeta

**Files:**
- Modify: `medisxime-landing/src/lib/schemas/sedeSchema.ts`
- Modify: `medisxime-landing/src/components/admin/FormularioSede.tsx`
- Modify: `medisxime-landing/src/components/admin/SedeTypes.ts`
- Modify: `medisxime-landing/src/components/admin/SedesDashboard.tsx`

**Interfaces:**
- Consumes (contrato de Task 1, ya definido — compila sin backend): `GET /api/locations` devuelve cada sede con `providerCode?: string | null`; `POST /api/locations` y `PATCH /api/locations/:id` aceptan `providerCode` en el body (el dashboard ya envía el form completo con `JSON.stringify(data)` — no hay que tocar `handleFormSuccess`).
- Produces: nada.

- [ ] **Step 1: Schema Zod**

En `medisxime-landing/src/lib/schemas/sedeSchema.ts`, dentro de `sedeSchema` tras `city`:

```ts
  providerCode: z.string().regex(/^\d{8,12}$/, "Código de prestador requerido (8 a 12 dígitos)"),
```

- [ ] **Step 2: Tipo Sede tolerante a sedes viejas**

`medisxime-landing/src/components/admin/SedeTypes.ts` — reemplazar la línea del tipo:

```ts
export type Sede = Omit<SedeFormValues, 'providerCode'> & { id: string; providerCode?: string | null };
```

- [ ] **Step 3: FormularioSede — default + campo**

En `medisxime-landing/src/components/admin/FormularioSede.tsx`:

1. En `defaultValues` (rama `initialData || {...}`), tras `city: '',`:

```ts
      providerCode: '',
```

2. Tras el `</div>` que cierra el campo **Ciudad** (después de su `{errors.city && ...}`), agregar el campo nuevo:

```tsx
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Código de Prestador *</label>
              <input
                {...register('providerCode')}
                inputMode="numeric"
                maxLength={12}
                onChange={e => setValue('providerCode', e.target.value.replace(/\D/g, ''), { shouldValidate: false })}
                style={{ width: '100%', boxSizing: 'border-box', background: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 16px', fontSize: 14, color: C.text, outline: 'none' }}
                placeholder="Ej. 0500123456"
              />
              {errors.providerCode && <p style={{ color: '#ef4444', fontSize: 11, margin: '4px 0 0 0' }}>{errors.providerCode.message}</p>}
            </div>
```

Nota: `setValue` ya está desestructurado del `useForm` en este archivo. Al editar una sede vieja (sin código), `initialData.providerCode` llega undefined y el schema bloqueará el submit hasta completarlo — comportamiento buscado.

- [ ] **Step 4: SedesDashboard — tarjeta**

En `medisxime-landing/src/components/admin/SedesDashboard.tsx`, localizar en la tarjeta de sede el elemento que muestra `{sede.address}` (y la ciudad) y agregar inmediatamente debajo, con el mismo nivel de anidamiento:

```tsx
                  <p style={{ fontSize: 12, color: sede.providerCode ? C.textBrown : C.textMuted, margin: '4px 0 0 0', fontStyle: sede.providerCode ? 'normal' : 'italic' }}>
                    {sede.providerCode ? `Prestador: ${sede.providerCode}` : '— sin código de prestador —'}
                  </p>
```

(Ajustar indentación al JSX real; si el token `textBrown` no existe en el objeto `C` local del archivo, usar `C.textMedium` o el token equivalente que sí exista.)

- [ ] **Step 5: Verificar compilación**

Run: `cd medisxime-landing; pnpm build`
Expected: tsc + vite sin errores.

- [ ] **Step 6: Commit**

```bash
git add medisxime-landing/src/lib/schemas/sedeSchema.ts medisxime-landing/src/components/admin/FormularioSede.tsx medisxime-landing/src/components/admin/SedeTypes.ts medisxime-landing/src/components/admin/SedesDashboard.tsx
git commit -m "feat(admin): campo obligatorio codigo de prestador en formulario y tarjeta de sedes"
```

---

### Task 3: Verificación end-to-end (tras merge de Tasks 1–2)

**Files:** ninguno (solo verificación).

- [ ] **Step 1:** Migración aplicada (`SELECT provider_code FROM locations LIMIT 1` no falla).
- [ ] **Step 2:** `POST /api/locations` sin `providerCode` → 400 con el mensaje exacto.
- [ ] **Step 3:** `POST /api/locations` con `providerCode: '0500123456'` → 201; `GET /api/locations` la devuelve con el código.
- [ ] **Step 4:** `PATCH` de una sede vieja SIN `providerCode` en el body → 200 y su código sigue null.
- [ ] **Step 5:** `PATCH` de la sede de prueba con `providerCode` inválido → 400; con válido → 200.
- [ ] **Step 6:** Eliminar la sede de prueba creada.
- [ ] **Step 7:** `pnpm build` del frontend en la rama integrada.
