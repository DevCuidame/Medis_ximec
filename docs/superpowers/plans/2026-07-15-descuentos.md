# Módulo Descuentos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apartado "Descuentos" (porcentaje y 2x1, código opcional, especialidad, vigencia, límites) aplicado al precio de las reservas, reemplazando y eliminando la lógica vieja de beneficios/descuentos de planes e inscripciones.

**Architecture:** Nuevo módulo backend `discounts` (migración 019, repositorio, servicio `resolveDiscount`, controlador, rutas ADMIN) + reescritura del bloque de pricing en `createBulkBookingRequests` + eliminación del API/UI de beneficios. Frontend: ítem "Descuentos" en `AdminSidebar`, pantalla `DescuentosDashboard` (patrón SedesDashboard), campo de código en el portal del paciente, y limpieza de beneficios en planes.

**Tech Stack:** Express + pg (transacciones), node:test vía tsx; React 19 + React Hook Form + Zod, Framer Motion.

**Spec:** `docs/superpowers/specs/2026-07-15-descuentos-design.md` (leerlo NO es necesario para implementar: cada brief es autosuficiente).

## Global Constraints

- Tipos: `kind ∈ {'percentage','two_for_one'}`; `value` (1–100) obligatorio solo para percentage.
- `code` opcional, único, normalizado a MAYÚSCULAS sin espacios; null = descuento automático.
- `specialty` null = "Todos los servicios".
- Elegibilidad: `is_active`, hoy ∈ `[starts_at, ends_at]` (null = abierto), `uses_count < max_uses_total` (null = ∞), redenciones del usuario `< max_uses_per_patient` (null = ∞), specialty null o igual a la de la oferta, y two_for_one exige `sessionCount >= 2`.
- Montos: percentage → `n * round(price * (1 - value/100))`, `discountPct = value`; two_for_one → `ceil(n/2) * price`, `discountPct = round(100 * (1 - ceil(n/2)/n))`.
- Código inválido al reservar → 400 con motivo específico; la reserva NO se crea. Sin código → el automático de mayor ahorro (empate: más reciente).
- Redención: 1 fila por solicitud + `uses_count + 1`, en la MISMA transacción; no se libera al rechazar.
- Las tablas/columnas viejas de beneficios NO se borran de la DB; solo el código deja de usarlas.
- El set-payment manual del admin en Inscripciones se conserva. `createBookingRequest` (individual, sin pricing) no se toca.
- Respuestas API `{ success, data }` / `{ success: false, error }`; textos UI en español formal.

## Ejecución en paralelo

- **Task 1** (backend módulo) primero. Luego **Task 2** (pricing + eliminación backend) depende de Task 1.
- **Task 3** (UI admin Descuentos) y **Task 4** (limpieza frontend + código paciente) son paralelizables entre sí y con Tasks 1–2 (compilan contra el contrato). Nota: Task 3 agrega una ruta a `App.tsx` y Task 4 elimina otra — regiones distintas, integrar por cherry-pick en ese orden.
- **Task 5**: verificación e2e final.

---

### Task 1: Backend — módulo Descuentos (migración, tipos, repo, servicio, CRUD)

**Files:**
- Create: `apps/backend/migrations/019_discounts.sql`
- Create: `apps/backend/src/types/discount.types.ts`
- Create: `apps/backend/src/repositories/discount.repository.ts`
- Create: `apps/backend/src/services/discount.service.ts`
- Create: `apps/backend/src/controllers/discounts.controller.ts`
- Create: `apps/backend/src/routes/discounts.routes.ts`
- Modify: `apps/backend/src/routes/index.ts`
- Test: `apps/backend/src/services/discount.service.test.ts`

**Interfaces:**
- Consumes: patrón existente (`pool` de `@config/database.js`, idiom de errores `Object.assign(new Error(msg), { statusCode })`, middleware `authenticate`/`authorize`).
- Produces:
  - `GET/POST /api/discounts`, `PATCH/DELETE /api/discounts/:id` (ADMIN) con shape `DiscountPublic = { id, name, kind, value, code, specialty, startsAt, endsAt, maxUsesTotal, maxUsesPerPatient, usesCount, isActive, createdAt }`.
  - `resolveDiscount(params: { userId: string; specialty: string | null; sessionCount: number; pricePerSession: number; code?: string }): Promise<AppliedDiscount | null>` con `AppliedDiscount = { discountId: string; name: string; kind: DiscountKind; expectedAmount: number; discountPct: number }` — lanza `{ statusCode: 400 }` si el código no es válido/aplicable.
  - `DiscountRepository.redeem(discountId: string, userId: string, bookingRequestId: string | null): Promise<void>` — transacción redención + uses_count.

- [ ] **Step 1: Migración**

`apps/backend/migrations/019_discounts.sql`:

```sql
-- ============================================================
-- Migration 019: Descuentos (porcentaje / 2x1) y redenciones
-- ============================================================

CREATE TABLE IF NOT EXISTS discounts (
  id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 VARCHAR(120) NOT NULL,
  kind                 VARCHAR(12)  NOT NULL CHECK (kind IN ('percentage', 'two_for_one')),
  value                INTEGER      CHECK (value BETWEEN 1 AND 100),
  code                 VARCHAR(40)  UNIQUE,
  specialty            VARCHAR(100),
  starts_at            DATE,
  ends_at              DATE,
  max_uses_total       INTEGER      CHECK (max_uses_total > 0),
  max_uses_per_patient INTEGER      CHECK (max_uses_per_patient > 0),
  uses_count           INTEGER      NOT NULL DEFAULT 0,
  is_active            BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_discounts_updated_at') THEN
    CREATE TRIGGER trg_discounts_updated_at
      BEFORE UPDATE ON discounts
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS discount_redemptions (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  discount_id        UUID        NOT NULL REFERENCES discounts(id) ON DELETE CASCADE,
  user_id            UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  booking_request_id UUID        REFERENCES booking_requests(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discount_redemptions_discount_user
  ON discount_redemptions (discount_id, user_id);
```

Run: `pnpm -F @medisxime/backend migrate` (si no hay DB accesible, continuar y reportar como concern).

- [ ] **Step 2: Tipos**

`apps/backend/src/types/discount.types.ts`:

```ts
export type DiscountKind = 'percentage' | 'two_for_one'

// ─── DB row shape ─────────────────────────────────────────────────────────────
export interface DiscountRecord {
  id:                   string
  name:                 string
  kind:                 DiscountKind
  value:                number | null
  code:                 string | null
  specialty:            string | null
  starts_at:            Date | null
  ends_at:              Date | null
  max_uses_total:       number | null
  max_uses_per_patient: number | null
  uses_count:           number
  is_active:            boolean
  created_at:           Date
  updated_at:           Date
}

// ─── API response shape ───────────────────────────────────────────────────────
export interface DiscountPublic {
  id:                string
  name:              string
  kind:              DiscountKind
  value:             number | null
  code:              string | null
  specialty:         string | null
  startsAt:          string | null
  endsAt:            string | null
  maxUsesTotal:      number | null
  maxUsesPerPatient: number | null
  usesCount:         number
  isActive:          boolean
  createdAt:         string
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────
export interface CreateDiscountDTO {
  name:               string
  kind:               DiscountKind
  value?:             number
  code?:              string
  specialty?:         string
  startsAt?:          string
  endsAt?:            string
  maxUsesTotal?:      number
  maxUsesPerPatient?: number
}

export interface UpdateDiscountDTO extends Partial<CreateDiscountDTO> {
  isActive?: boolean
}

// ─── Aplicación en reservas ───────────────────────────────────────────────────
export interface AppliedDiscount {
  discountId:     string
  name:           string
  kind:           DiscountKind
  expectedAmount: number
  discountPct:    number
}
```

- [ ] **Step 3: Repositorio**

`apps/backend/src/repositories/discount.repository.ts`:

```ts
import { pool } from '@config/database.js'
import type { DiscountRecord, DiscountPublic, CreateDiscountDTO, UpdateDiscountDTO } from '../types/discount.types.js'

function toPublic(r: DiscountRecord): DiscountPublic {
  return {
    id:                r.id,
    name:              r.name,
    kind:              r.kind,
    value:             r.value,
    code:              r.code,
    specialty:         r.specialty,
    startsAt:          r.starts_at ? new Date(r.starts_at).toISOString().slice(0, 10) : null,
    endsAt:            r.ends_at ? new Date(r.ends_at).toISOString().slice(0, 10) : null,
    maxUsesTotal:      r.max_uses_total,
    maxUsesPerPatient: r.max_uses_per_patient,
    usesCount:         r.uses_count,
    isActive:          r.is_active,
    createdAt:         r.created_at.toISOString(),
  }
}

const RETURNING = `RETURNING *`

export const DiscountRepository = {
  async list(): Promise<DiscountPublic[]> {
    const { rows } = await pool.query<DiscountRecord>(
      `SELECT * FROM discounts ORDER BY created_at DESC`
    )
    return rows.map(toPublic)
  },

  async findById(id: string): Promise<DiscountRecord | null> {
    const { rows } = await pool.query<DiscountRecord>(
      `SELECT * FROM discounts WHERE id = $1 LIMIT 1`, [id]
    )
    return rows[0] ?? null
  },

  async findByCode(code: string): Promise<DiscountRecord | null> {
    const { rows } = await pool.query<DiscountRecord>(
      `SELECT * FROM discounts WHERE code = $1 LIMIT 1`, [code]
    )
    return rows[0] ?? null
  },

  /** Descuentos automáticos (sin código) candidatos: activos y sin código. El resto de la elegibilidad se evalúa en el servicio. */
  async findAutomaticCandidates(): Promise<DiscountRecord[]> {
    const { rows } = await pool.query<DiscountRecord>(
      `SELECT * FROM discounts WHERE code IS NULL AND is_active = TRUE ORDER BY created_at DESC`
    )
    return rows
  },

  async countUserRedemptions(discountId: string, userId: string): Promise<number> {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS n FROM discount_redemptions WHERE discount_id = $1 AND user_id = $2`,
      [discountId, userId]
    )
    return rows[0].n
  },

  /** Registra la redención e incrementa uses_count en una sola transacción. */
  async redeem(discountId: string, userId: string, bookingRequestId: string | null): Promise<void> {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(
        `INSERT INTO discount_redemptions (discount_id, user_id, booking_request_id) VALUES ($1, $2, $3)`,
        [discountId, userId, bookingRequestId]
      )
      await client.query(
        `UPDATE discounts SET uses_count = uses_count + 1 WHERE id = $1`,
        [discountId]
      )
      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  },

  async create(dto: CreateDiscountDTO & { code: string | null; value: number | null }): Promise<DiscountPublic> {
    const { rows } = await pool.query<DiscountRecord>(
      `INSERT INTO discounts (name, kind, value, code, specialty, starts_at, ends_at, max_uses_total, max_uses_per_patient)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ${RETURNING}`,
      [
        dto.name.trim(),
        dto.kind,
        dto.value,
        dto.code,
        dto.specialty?.trim() || null,
        dto.startsAt ?? null,
        dto.endsAt ?? null,
        dto.maxUsesTotal ?? null,
        dto.maxUsesPerPatient ?? null,
      ]
    )
    return toPublic(rows[0])
  },

  async update(id: string, dto: UpdateDiscountDTO & { code?: string | null; value?: number | null }): Promise<DiscountPublic | null> {
    const sets: string[] = []
    const values: unknown[] = []
    let i = 1

    if (dto.name !== undefined)              { sets.push(`name = $${i++}`);                 values.push(dto.name.trim()) }
    if (dto.kind !== undefined)              { sets.push(`kind = $${i++}`);                 values.push(dto.kind) }
    if (dto.value !== undefined)             { sets.push(`value = $${i++}`);                values.push(dto.value) }
    if (dto.code !== undefined)              { sets.push(`code = $${i++}`);                 values.push(dto.code) }
    if (dto.specialty !== undefined)         { sets.push(`specialty = $${i++}`);            values.push(dto.specialty?.trim() || null) }
    if (dto.startsAt !== undefined)          { sets.push(`starts_at = $${i++}`);            values.push(dto.startsAt || null) }
    if (dto.endsAt !== undefined)            { sets.push(`ends_at = $${i++}`);              values.push(dto.endsAt || null) }
    if (dto.maxUsesTotal !== undefined)      { sets.push(`max_uses_total = $${i++}`);       values.push(dto.maxUsesTotal ?? null) }
    if (dto.maxUsesPerPatient !== undefined) { sets.push(`max_uses_per_patient = $${i++}`); values.push(dto.maxUsesPerPatient ?? null) }
    if (dto.isActive !== undefined)          { sets.push(`is_active = $${i++}`);            values.push(dto.isActive) }
    if (sets.length === 0) {
      const row = await this.findById(id)
      return row ? toPublic(row) : null
    }

    values.push(id)
    const { rows } = await pool.query<DiscountRecord>(
      `UPDATE discounts SET ${sets.join(', ')} WHERE id = $${i} ${RETURNING}`,
      values
    )
    return rows[0] ? toPublic(rows[0]) : null
  },

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await pool.query(`DELETE FROM discounts WHERE id = $1`, [id])
    return (rowCount ?? 0) > 0
  },
}
```

- [ ] **Step 4: Test del servicio (falla)**

`apps/backend/src/services/discount.service.test.ts`:

```ts
import { test, beforeEach } from 'node:test'
import assert from 'node:assert'

process.env.DATABASE_URL ||= 'postgres://test:test@localhost:5432/test'
process.env.JWT_SECRET ||= 'clave-de-prueba'

const { resolveDiscount, validateDiscountDTO } = await import('./discount.service.js')
const { DiscountRepository } = await import('../repositories/discount.repository.js')

const hoy = new Date()
const ayer = new Date(hoy.getTime() - 86400000)
const manana = new Date(hoy.getTime() + 86400000)

function d(over: Record<string, unknown> = {}) {
  return {
    id: 'd1', name: 'Promo', kind: 'percentage', value: 20, code: null,
    specialty: null, starts_at: null, ends_at: null,
    max_uses_total: null, max_uses_per_patient: null, uses_count: 0,
    is_active: true, created_at: hoy, updated_at: hoy,
    ...over,
  }
}

let candidates: any[] = []
let byCode: any = null
let userRedemptions = 0

beforeEach(() => {
  candidates = []
  byCode = null
  userRedemptions = 0
  ;(DiscountRepository as any).findAutomaticCandidates = async () => candidates
  ;(DiscountRepository as any).findByCode = async () => byCode
  ;(DiscountRepository as any).countUserRedemptions = async () => userRedemptions
})

const base = { userId: 'u1', specialty: 'Salud Ocupacional', sessionCount: 4, pricePerSession: 100000 }

// ── resolveDiscount: automáticos ─────────────────────────────────────────────
test('sin descuentos aplicables devuelve null', async () => {
  assert.strictEqual(await resolveDiscount({ ...base }), null)
})

test('automático percentage: monto y pct', async () => {
  candidates = [d()]
  const r = await resolveDiscount({ ...base })
  assert.strictEqual(r!.expectedAmount, 4 * 80000)
  assert.strictEqual(r!.discountPct, 20)
})

test('automático two_for_one: ceil(n/2) y pct efectivo', async () => {
  candidates = [d({ kind: 'two_for_one', value: null })]
  const r = await resolveDiscount({ ...base, sessionCount: 3 })
  assert.strictEqual(r!.expectedAmount, 2 * 100000)
  assert.strictEqual(r!.discountPct, Math.round(100 * (1 - 2 / 3)))
})

test('two_for_one con 1 sesión no aplica', async () => {
  candidates = [d({ kind: 'two_for_one', value: null })]
  assert.strictEqual(await resolveDiscount({ ...base, sessionCount: 1 }), null)
})

test('elige el de mayor ahorro entre automáticos', async () => {
  candidates = [d({ id: 'a', value: 10 }), d({ id: 'b', value: 30 })]
  const r = await resolveDiscount({ ...base })
  assert.strictEqual(r!.discountId, 'b')
})

test('filtra por especialidad, vigencia, límite total y por paciente', async () => {
  candidates = [d({ specialty: 'Otra Especialidad' })]
  assert.strictEqual(await resolveDiscount({ ...base }), null)

  candidates = [d({ ends_at: ayer })]
  assert.strictEqual(await resolveDiscount({ ...base }), null)

  candidates = [d({ starts_at: manana })]
  assert.strictEqual(await resolveDiscount({ ...base }), null)

  candidates = [d({ max_uses_total: 5, uses_count: 5 })]
  assert.strictEqual(await resolveDiscount({ ...base }), null)

  candidates = [d({ max_uses_per_patient: 1 })]
  userRedemptions = 1
  assert.strictEqual(await resolveDiscount({ ...base }), null)
})

// ── resolveDiscount: con código ──────────────────────────────────────────────
test('código válido gana y aplica', async () => {
  byCode = d({ code: 'PROMO20' })
  const r = await resolveDiscount({ ...base, code: 'promo20' })
  assert.strictEqual(r!.discountId, 'd1')
})

test('código inexistente lanza 400', async () => {
  await assert.rejects(() => resolveDiscount({ ...base, code: 'NADA' }), (e: any) => e.statusCode === 400)
})

test('código vencido / agotado / de otra especialidad lanza 400 con motivo', async () => {
  byCode = d({ code: 'X', ends_at: ayer })
  await assert.rejects(() => resolveDiscount({ ...base, code: 'X' }), (e: any) => /vencido/i.test(e.message))

  byCode = d({ code: 'X', max_uses_total: 1, uses_count: 1 })
  await assert.rejects(() => resolveDiscount({ ...base, code: 'X' }), (e: any) => /agotado/i.test(e.message))

  byCode = d({ code: 'X', specialty: 'Otra Especialidad' })
  await assert.rejects(() => resolveDiscount({ ...base, code: 'X' }), (e: any) => /no aplica/i.test(e.message))
})

// ── validateDiscountDTO ──────────────────────────────────────────────────────
test('percentage sin value → error; two_for_one normaliza value a null; código a mayúsculas', () => {
  assert.throws(() => validateDiscountDTO({ name: 'X', kind: 'percentage' } as any), (e: any) => e.statusCode === 400)
  const a = validateDiscountDTO({ name: 'X', kind: 'two_for_one', value: 50, code: ' promo1 ' } as any)
  assert.strictEqual(a.value, null)
  assert.strictEqual(a.code, 'PROMO1')
  assert.throws(() => validateDiscountDTO({ name: 'X', kind: 'percentage', value: 150 } as any), (e: any) => e.statusCode === 400)
  assert.throws(() => validateDiscountDTO({ name: 'X', kind: 'percentage', value: 10, startsAt: '2026-08-01', endsAt: '2026-07-01' } as any), (e: any) => e.statusCode === 400)
})
```

Run (desde `apps/backend/`): `npx tsx --test src/services/discount.service.test.ts` → Expected: FAIL (módulo no existe).

- [ ] **Step 5: Servicio**

`apps/backend/src/services/discount.service.ts`:

```ts
import { DiscountRepository } from '@repositories/discount.repository.js'
import type { DiscountRecord, DiscountKind, AppliedDiscount, CreateDiscountDTO } from '../types/discount.types.js'

function err400(msg: string): Error {
  return Object.assign(new Error(msg), { statusCode: 400 })
}

/** Normaliza y valida un DTO de creación/edición. Devuelve { value, code } normalizados. */
export function validateDiscountDTO(dto: CreateDiscountDTO): { value: number | null; code: string | null } {
  if (!dto.name?.trim()) throw err400('El nombre es requerido.')
  if (dto.kind !== 'percentage' && dto.kind !== 'two_for_one') throw err400('Tipo de descuento inválido.')

  let value: number | null = null
  if (dto.kind === 'percentage') {
    if (dto.value == null || !Number.isInteger(dto.value) || dto.value < 1 || dto.value > 100) {
      throw err400('El valor debe ser un porcentaje entre 1 y 100.')
    }
    value = dto.value
  }

  const code = dto.code?.trim() ? dto.code.trim().toUpperCase().replace(/\s+/g, '') : null

  if (dto.startsAt && dto.endsAt && dto.startsAt > dto.endsAt) {
    throw err400('La fecha de inicio debe ser anterior a la fecha fin.')
  }
  if (dto.maxUsesTotal != null && dto.maxUsesTotal < 1) throw err400('El límite de usos totales debe ser mayor a 0.')
  if (dto.maxUsesPerPatient != null && dto.maxUsesPerPatient < 1) throw err400('El límite por paciente debe ser mayor a 0.')

  return { value, code }
}

interface ResolveParams {
  userId:          string
  specialty:       string | null
  sessionCount:    number
  pricePerSession: number
  code?:           string
}

interface Ineligibility { reason: string }

/** null = elegible; si no, el motivo. NO consulta redenciones (eso es aparte, async). */
function ineligible(d: DiscountRecord, p: ResolveParams): Ineligibility | null {
  const today = new Date().toISOString().slice(0, 10)
  if (!d.is_active) return { reason: 'El código no está activo.' }
  if (d.starts_at && new Date(d.starts_at).toISOString().slice(0, 10) > today) return { reason: 'El código aún no está vigente.' }
  if (d.ends_at && new Date(d.ends_at).toISOString().slice(0, 10) < today) return { reason: 'El código está vencido.' }
  if (d.max_uses_total != null && d.uses_count >= d.max_uses_total) return { reason: 'El código está agotado.' }
  if (d.specialty && d.specialty !== p.specialty) return { reason: 'El código no aplica a este servicio.' }
  if (d.kind === 'two_for_one' && p.sessionCount < 2) return { reason: 'El 2x1 requiere al menos 2 sesiones.' }
  return null
}

function amounts(d: DiscountRecord, p: ResolveParams): { expectedAmount: number; discountPct: number } {
  const full = p.sessionCount * p.pricePerSession
  if (d.kind === 'percentage') {
    const pct = d.value ?? 0
    return {
      expectedAmount: p.sessionCount * Math.round(p.pricePerSession * (1 - pct / 100)),
      discountPct: pct,
    }
  }
  const paid = Math.ceil(p.sessionCount / 2)
  return {
    expectedAmount: paid * p.pricePerSession,
    discountPct: Math.round(100 * (1 - paid / p.sessionCount)),
  }
}

function toApplied(d: DiscountRecord, p: ResolveParams): AppliedDiscount {
  const a = amounts(d, p)
  return { discountId: d.id, name: d.name, kind: d.kind as DiscountKind, ...a }
}

export async function resolveDiscount(p: ResolveParams): Promise<AppliedDiscount | null> {
  if (p.sessionCount < 1 || p.pricePerSession <= 0) {
    if (p.code) throw err400('El código no aplica a este servicio.')
    return null
  }

  if (p.code) {
    const code = p.code.trim().toUpperCase().replace(/\s+/g, '')
    const d = await DiscountRepository.findByCode(code)
    if (!d) throw err400('Código inválido.')
    const why = ineligible(d, p)
    if (why) throw err400(why.reason)
    if (d.max_uses_per_patient != null) {
      const used = await DiscountRepository.countUserRedemptions(d.id, p.userId)
      if (used >= d.max_uses_per_patient) throw err400('Ya usaste este código el máximo de veces.')
    }
    return toApplied(d, p)
  }

  const candidates = await DiscountRepository.findAutomaticCandidates()
  let best: AppliedDiscount | null = null
  for (const d of candidates) {
    if (ineligible(d, p)) continue
    if (d.max_uses_per_patient != null) {
      const used = await DiscountRepository.countUserRedemptions(d.id, p.userId)
      if (used >= d.max_uses_per_patient) continue
    }
    const applied = toApplied(d, p)
    // candidates viene ordenado por created_at DESC → en empate gana el más reciente
    if (!best || applied.expectedAmount < best.expectedAmount) best = applied
  }
  return best
}
```

- [ ] **Step 6: Verificar que el test pasa**

Run: `npx tsx --test src/services/discount.service.test.ts` → Expected: todos PASS.

- [ ] **Step 7: Controlador y rutas**

`apps/backend/src/controllers/discounts.controller.ts`:

```ts
import type { Request, Response } from 'express'
import { DiscountRepository } from '@repositories/discount.repository.js'
import { validateDiscountDTO } from '@services/discount.service.js'

export async function listDiscounts(_req: Request, res: Response): Promise<void> {
  try {
    const discounts = await DiscountRepository.list()
    res.json({ success: true, data: { discounts } })
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ success: false, error: err.message })
  }
}

export async function createDiscount(req: Request, res: Response): Promise<void> {
  try {
    const { value, code } = validateDiscountDTO(req.body)
    const discount = await DiscountRepository.create({ ...req.body, value, code })
    res.status(201).json({ success: true, data: { discount } })
  } catch (err: any) {
    if (err.code === '23505') { res.status(409).json({ success: false, error: 'Ese código ya existe.' }); return }
    res.status(err.statusCode ?? 500).json({ success: false, error: err.message })
  }
}

export async function updateDiscount(req: Request, res: Response): Promise<void> {
  try {
    let normalized: { value?: number | null; code?: string | null } = {}
    // Solo re-validar el conjunto si cambian campos de contenido (no un simple toggle de isActive)
    if (req.body.name !== undefined || req.body.kind !== undefined || req.body.value !== undefined || req.body.code !== undefined || req.body.startsAt !== undefined || req.body.endsAt !== undefined || req.body.maxUsesTotal !== undefined || req.body.maxUsesPerPatient !== undefined) {
      const existing = await DiscountRepository.findById(req.params.id)
      if (!existing) { res.status(404).json({ success: false, error: 'Descuento no encontrado.' }); return }
      const merged = {
        name: req.body.name ?? existing.name,
        kind: req.body.kind ?? existing.kind,
        value: req.body.value ?? existing.value ?? undefined,
        code: req.body.code !== undefined ? req.body.code : existing.code ?? undefined,
        specialty: req.body.specialty !== undefined ? req.body.specialty : existing.specialty ?? undefined,
        startsAt: req.body.startsAt !== undefined ? req.body.startsAt : (existing.starts_at ? new Date(existing.starts_at).toISOString().slice(0, 10) : undefined),
        endsAt: req.body.endsAt !== undefined ? req.body.endsAt : (existing.ends_at ? new Date(existing.ends_at).toISOString().slice(0, 10) : undefined),
        maxUsesTotal: req.body.maxUsesTotal !== undefined ? req.body.maxUsesTotal : existing.max_uses_total ?? undefined,
        maxUsesPerPatient: req.body.maxUsesPerPatient !== undefined ? req.body.maxUsesPerPatient : existing.max_uses_per_patient ?? undefined,
      }
      normalized = validateDiscountDTO(merged as any)
    }
    const discount = await DiscountRepository.update(req.params.id, { ...req.body, ...normalized })
    if (!discount) { res.status(404).json({ success: false, error: 'Descuento no encontrado.' }); return }
    res.json({ success: true, data: { discount } })
  } catch (err: any) {
    if (err.code === '23505') { res.status(409).json({ success: false, error: 'Ese código ya existe.' }); return }
    res.status(err.statusCode ?? 500).json({ success: false, error: err.message })
  }
}

export async function deleteDiscount(req: Request, res: Response): Promise<void> {
  try {
    const deleted = await DiscountRepository.delete(req.params.id)
    if (!deleted) { res.status(404).json({ success: false, error: 'Descuento no encontrado.' }); return }
    res.json({ success: true, data: null })
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ success: false, error: err.message })
  }
}
```

`apps/backend/src/routes/discounts.routes.ts`:

```ts
import { Router } from 'express'
import { authenticate, authorize } from '@middleware/auth.middleware.js'
import { listDiscounts, createDiscount, updateDiscount, deleteDiscount } from '@controllers/discounts.controller.js'

const router: Router = Router()

router.get(   '/', authenticate, authorize('ADMIN'), listDiscounts)
router.post(  '/', authenticate, authorize('ADMIN'), createDiscount)
router.patch( '/:id', authenticate, authorize('ADMIN'), updateDiscount)
router.delete('/:id', authenticate, authorize('ADMIN'), deleteDiscount)

export default router
```

En `apps/backend/src/routes/index.ts` agregar (junto a los demás):

```ts
import discountsRoutes from './discounts.routes.js'
// ...
router.use('/discounts', discountsRoutes)
```

- [ ] **Step 8: Verificar todo y commitear**

Run: `npx tsx --test src/services/discount.service.test.ts` → PASS.
Run: `pnpm -F @medisxime/backend build` → sin errores.

```bash
git add apps/backend/migrations/019_discounts.sql apps/backend/src/types/discount.types.ts apps/backend/src/repositories/discount.repository.ts apps/backend/src/services/discount.service.ts apps/backend/src/controllers/discounts.controller.ts apps/backend/src/routes/discounts.routes.ts apps/backend/src/routes/index.ts apps/backend/src/services/discount.service.test.ts
git commit -m "feat(backend): modulo de descuentos (migracion 019, CRUD ADMIN y resolveDiscount)"
```

---

### Task 2: Backend — pricing con descuentos nuevos y eliminación de beneficios

**Files:**
- Modify: `apps/backend/src/controllers/services.controller.ts` (bloque de pricing en `createBulkBookingRequests`, líneas ~266–328)
- Delete: `apps/backend/src/routes/benefits.routes.ts`, `apps/backend/src/controllers/benefits.controller.ts`, `apps/backend/src/repositories/benefit.repository.ts`
- Modify: `apps/backend/src/routes/index.ts` (quitar import y mount de benefits)
- Modify: `apps/backend/src/repositories/user-membership.repository.ts`, `apps/backend/src/types/user-membership.types.ts` (dejar de exponer discount/beneficios/créditos)
- Modify: `apps/backend/src/repositories/membership.repository.ts`, `apps/backend/src/types/membership.types.ts` (planes sin beneficios ni discount)
- Modify: `apps/backend/src/utils/email.util.ts` (solo si menciona beneficios)
- Test: `apps/backend/src/controllers/services.pricing.test.ts` (nuevo)

**Interfaces:**
- Consumes (Task 1): `resolveDiscount({ userId, specialty, sessionCount, pricePerSession, code? })` → `AppliedDiscount | null` (lanza `{statusCode:400}` con motivo si el código es inválido); `DiscountRepository.redeem(discountId, userId, bookingRequestId)`.
- Produces (contrato para Task 4): `POST /api/services/requests/bulk` acepta `discountCode?: string` en el body; con código inválido responde 400 `{ success:false, error: <motivo> }` y NO crea la reserva; la respuesta 201 incluye `request` con `expectedAmount` y `discountPct` reflejando el descuento. `GET /api/benefits` deja de existir (404).

- [ ] **Step 1: Test del pricing nuevo (falla)**

`apps/backend/src/controllers/services.pricing.test.ts` — monkeypatch de repos, mismo patrón de los tests existentes:

```ts
import { test, beforeEach } from 'node:test'
import assert from 'node:assert'

process.env.DATABASE_URL ||= 'postgres://test:test@localhost:5432/test'
process.env.JWT_SECRET ||= 'clave-de-prueba'

const { createBulkBookingRequests } = await import('./services.controller.js')
const { ServiceOfferRepository, BookingRequestRepository } = await import('../repositories/services.repository.js')
const { DiscountRepository } = await import('../repositories/discount.repository.js')

function fakeRes() {
  const res: any = { statusCode: 200, body: null }
  res.status = (c: number) => { res.statusCode = c; return res }
  res.json = (b: unknown) => { res.body = b; return res }
  return res
}

let captured: any
let redemption: any

beforeEach(() => {
  captured = null
  redemption = null
  ;(ServiceOfferRepository as any).findById = async () => ({
    id: 'offer-1', price: 100000, capacity: 10, enrolledCount: 0, status: 'published',
    discipline: { name: 'Salud Ocupacional' },
  })
  ;(BookingRequestRepository as any).createGroupEnrollment = async (_ids: string[], _uid: string, opts: any) => {
    captured = opts
    return { id: 'req-1', ...opts }
  }
  ;(DiscountRepository as any).findAutomaticCandidates = async () => []
  ;(DiscountRepository as any).findByCode = async () => null
  ;(DiscountRepository as any).countUserRedemptions = async () => 0
  ;(DiscountRepository as any).redeem = async (d: string, u: string, b: string) => { redemption = { d, u, b } }
})

function req(body: Record<string, unknown>) {
  return { user: { id: 'u1', email: 'x@y.co', role: 'USER' }, body } as any
}

test('sin descuentos: precio completo n*price', async () => {
  const res = fakeRes()
  await createBulkBookingRequests(req({ offerIds: ['offer-1', 'offer-1'] }), res)
  assert.strictEqual(res.statusCode, 201)
  assert.strictEqual(captured.expectedAmount, 200000)
  assert.strictEqual(captured.discountPct, undefined)
  assert.strictEqual(redemption, null)
})

test('automático percentage aplica y registra redención', async () => {
  ;(DiscountRepository as any).findAutomaticCandidates = async () => [{
    id: 'd1', name: 'Promo', kind: 'percentage', value: 20, code: null, specialty: null,
    starts_at: null, ends_at: null, max_uses_total: null, max_uses_per_patient: null,
    uses_count: 0, is_active: true, created_at: new Date(), updated_at: new Date(),
  }]
  const res = fakeRes()
  await createBulkBookingRequests(req({ offerIds: ['offer-1', 'offer-1'] }), res)
  assert.strictEqual(res.statusCode, 201)
  assert.strictEqual(captured.expectedAmount, 160000)
  assert.strictEqual(captured.discountPct, 20)
  assert.deepStrictEqual(redemption, { d: 'd1', u: 'u1', b: 'req-1' })
})

test('código inválido responde 400 y NO crea la reserva', async () => {
  const res = fakeRes()
  await createBulkBookingRequests(req({ offerIds: ['offer-1'], discountCode: 'NADA' }), res)
  assert.strictEqual(res.statusCode, 400)
  assert.strictEqual(captured, null)
})
```

Run: `npx tsx --test src/controllers/services.pricing.test.ts` → FAIL (el flujo actual usa membresías y no acepta discountCode).

- [ ] **Step 2: Reemplazar el bloque de pricing**

En `createBulkBookingRequests` (`services.controller.ts`): el body pasa a
`const { offerIds, paymentMethod, discountCode } = req.body as { offerIds: string[]; paymentMethod?: 'cash' | 'wompi'; discountCode?: string }`.
Eliminar TODO el bloque desde `// ── Server-side per-category session quota check` hasta antes de `const request = await BookingRequestRepository.createGroupEnrollment(` (membresías, inscriptionDiscountPct, créditos, clases gratis) y reemplazarlo por:

```ts
    // ── Precio con descuentos (módulo Descuentos) ─────────────────────────
    const sessionCount = offerIds.length;
    const pricePerSession = lead.price ?? 0;

    let applied: AppliedDiscount | null = null;
    try {
      applied = await resolveDiscount({
        userId,
        specialty: lead.discipline?.name ?? null,
        sessionCount,
        pricePerSession,
        code: discountCode,
      });
    } catch (err: unknown) {
      const status = (err as { statusCode?: number }).statusCode ?? 500;
      res.status(status).json({ success: false, error: (err as Error).message });
      return;
    }

    const computedExpectedAmount = pricePerSession > 0
      ? (applied ? applied.expectedAmount : sessionCount * pricePerSession)
      : undefined;
    const computedDiscountPct = applied?.discountPct;
```

Después de crear `request`, registrar la redención:

```ts
    if (applied) {
      await DiscountRepository.redeem(applied.discountId, userId, request.id);
    }
```

Imports nuevos en el archivo: `import { resolveDiscount } from '@services/discount.service.js'`, `import { DiscountRepository } from '@repositories/discount.repository.js'`, `import type { AppliedDiscount } from '../types/discount.types.js'`. Eliminar los imports/usos que queden muertos (`UserMembershipRepository` si su único uso era este bloque, `getDisciplineCategory` si queda sin uso — verificar con grep dentro del archivo). NO tocar `createBookingRequest` (individual) ni `setBookingPayment`/confirm/reject (registro manual del admin).

- [ ] **Step 3: Verificar que el test pasa**

Run: `npx tsx --test src/controllers/services.pricing.test.ts` → PASS.

- [ ] **Step 4: Eliminar el API de beneficios**

- Borrar los 3 archivos (`git rm`): `routes/benefits.routes.ts`, `controllers/benefits.controller.ts`, `repositories/benefit.repository.ts`.
- En `routes/index.ts` quitar `import benefitsRoutes ...` y `router.use('/benefits', benefitsRoutes)`.

- [ ] **Step 5: Limpiar membresías (tipos y repos)**

En `membership.types.ts`, `membership.repository.ts`, `user-membership.types.ts`, `user-membership.repository.ts`, `user-memberships.controller.ts` y `memberships.controller.ts` (si aplica): eliminar campos/joins/lecturas de beneficios, `discountPercent`, créditos por categoría, `coversFreeClasses`, `classesRemaining`, `hasClassCredits`, y `findActiveInscriptionByUserId` si su único uso era el descuento. Las membresías siguen funcionando (CRUD de planes, compra/estado de membresía del usuario) — solo dejan de otorgar descuentos/clases. En `email.util.ts` quitar menciones de beneficios si las hay. Regla de decisión: si al quitar un campo un endpoint deja de compilar, se quita el campo también de la respuesta del endpoint (no se inventan reemplazos).

- [ ] **Step 6: Verificación de borrado y build**

Run (desde `apps/backend/`):
- `grep -rin "benefit" src/` → 0 resultados con código activo.
- `grep -rin "discountPercent\|coversFreeClasses\|categoryCredits\|hasClassCredits\|findActiveInscription" src/` → 0 resultados.
- `npx tsx --test src/controllers/services.pricing.test.ts src/services/discount.service.test.ts src/controllers/location.controller.test.ts src/services/professional.service.test.ts src/utils/crypto.util.test.ts` → todos PASS.
- `pnpm -F @medisxime/backend build` → sin errores.

- [ ] **Step 7: Commit**

```bash
git add -u apps/backend/src
git add apps/backend/src/controllers/services.pricing.test.ts
git commit -m "feat(backend): pricing de reservas con modulo Descuentos; se elimina beneficios/descuentos viejos"
```

---

### Task 3: Frontend — sidebar, ruta y DescuentosDashboard

**Files:**
- Modify: `medisxime-landing/src/components/admin/AdminSidebar.tsx`
- Modify: `medisxime-landing/src/App.tsx` (solo AGREGAR import + ruta; no tocar nada más)
- Create: `medisxime-landing/src/lib/schemas/descuentoSchema.ts`
- Create: `medisxime-landing/src/components/admin/DescuentosDashboard.tsx`

**Interfaces:**
- Consumes (contrato de Task 1, compila sin backend): `GET /api/discounts` → `{ success, data: { discounts: DiscountPublic[] } }` con `DiscountPublic = { id, name, kind: 'percentage'|'two_for_one', value, code, specialty, startsAt, endsAt, maxUsesTotal, maxUsesPerPatient, usesCount, isActive, createdAt }`; `POST /api/discounts` (mismo shape en body, camelCase), `PATCH /api/discounts/:id`, `DELETE /api/discounts/:id`. Errores `{ success:false, error }` (409 código duplicado). Todo con Bearer token.
- Produces: ruta `/admin/discounts`; ítem `descuentos` en el sidebar.

- [ ] **Step 1: Sidebar**

En `AdminSidebar.tsx`: `AdminNavKey` gana `'descuentos'`; en `NAV`, entre Servicios y Finanzas:

```ts
  { key: 'descuentos',      icon: BadgePercent,    label: 'Descuentos',      route: '/admin/discounts' },
```

(import `BadgePercent` de lucide-react).

- [ ] **Step 2: Ruta en App.tsx**

Agregar `import { DescuentosDashboard } from './components/admin/DescuentosDashboard'` y, junto a las demás rutas admin (mismo patrón de ProtectedRoute que `/admin/finances`):

```tsx
        <Route
          path="/admin/discounts"
          element={<ProtectedRoute allowedRoles={['ADMIN']}><DescuentosDashboard /></ProtectedRoute>}
        />
```

(Copiar el wrapper exacto que usan las rutas admin vecinas en el archivo — si el prop se llama distinto a `allowedRoles`, usar el de las vecinas.)

- [ ] **Step 3: Schema Zod**

`medisxime-landing/src/lib/schemas/descuentoSchema.ts`:

```ts
import { z } from 'zod';

export const descuentoSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  kind: z.enum(['percentage', 'two_for_one']),
  value: z.string().optional(),
  code: z.string().optional(),
  specialty: z.string().optional(),   // '' = Todos los servicios
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  maxUsesTotal: z.string().optional(),
  maxUsesPerPatient: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.kind === 'percentage') {
    const v = Number(data.value);
    if (!data.value || !Number.isInteger(v) || v < 1 || v > 100) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['value'], message: 'Porcentaje entre 1 y 100' });
    }
  }
  if (data.startsAt && data.endsAt && data.startsAt > data.endsAt) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endsAt'], message: 'La fecha fin debe ser posterior al inicio' });
  }
  for (const k of ['maxUsesTotal', 'maxUsesPerPatient'] as const) {
    if (data[k] && (!Number.isInteger(Number(data[k])) || Number(data[k]) < 1)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [k], message: 'Debe ser un entero mayor a 0' });
    }
  }
});

export type DescuentoFormValues = z.infer<typeof descuentoSchema>;
```

- [ ] **Step 4: DescuentosDashboard**

`DescuentosDashboard.tsx` nuevo, siguiendo **el patrón de `SedesDashboard.tsx`** (leerlo como referencia de estructura: objeto `C` de tokens, `AdminSidebar active="descuentos"`, topbar con hamburguesa + título, `AnimatePresence` para modales, estado `saveError` con banner):

- Header de contenido: kicker "Promociones" (uppercase pequeño dorado), título "Descuentos" (Cormorant Garamond), subtítulo "Porcentajes, 2x1 y códigos de descuento para tus pacientes.", botón "Nuevo Descuento" (gradiente café, ícono Plus).
- Carga: `GET /api/discounts` con Bearer (`localStorage.getItem('accessToken')`).
- Empty state (sin descuentos): "Aún no has creado ningún descuento." + "Usa \"Nuevo Descuento\" para crear el primero." con ícono `BadgePercent` grande en gris.
- Grid de tarjetas por descuento: nombre; chip del tipo (`Porcentaje X%` o `2x1`); código en monospace o "Automático"; especialidad o "Todos los servicios"; vigencia (`startsAt → endsAt`, "Sin vencimiento" si ambos null); usos `usesCount / maxUsesTotal` (o `usesCount / ∞`); badge Activo/Inactivo; acciones: Editar, Activar/Desactivar (PATCH `{ isActive }`), Eliminar (modal de confirmación, patrón del de EspaciosDashboard con su `deleteError`).
- Modal Crear/Editar (slide-over o modal centrado, como prefiera el patrón copiado): formulario React Hook Form + zodResolver con `descuentoSchema`. Campos y labels EXACTOS:
  - "Nombre" (texto), "Tipo" (select: "Porcentaje" / "2x1"), "Valor (%)" (numérico, SOLO visible si Tipo=Porcentaje), "Código (opcional)" con hint "Déjalo vacío para que se aplique automáticamente", "Especialidad" (select con primera opción "Todos los servicios" y luego las especialidades — usar la misma fuente de especialidades que usa el formulario de servicios `FormularioServicio.tsx`/`CreateService.tsx`; si ahí es una constante, importarla o replicarla), "Fecha inicio" (date), "Fecha fin" (date), "Límite usos totales" (numérico opcional), "Límite por paciente" (numérico opcional). Botón "Crear Descuento" / "Guardar Cambios".
  - Submit: mapear a camelCase del API (`value`/límites como number o undefined, `specialty: '' → undefined`); POST o PATCH; error del servidor visible en banner sin cerrar el modal.

- [ ] **Step 5: Verificar y commitear**

Run: `cd medisxime-landing; pnpm build` → sin errores.

```bash
git add medisxime-landing/src/components/admin/AdminSidebar.tsx medisxime-landing/src/App.tsx medisxime-landing/src/lib/schemas/descuentoSchema.ts medisxime-landing/src/components/admin/DescuentosDashboard.tsx
git commit -m "feat(admin): apartado Descuentos (sidebar, ruta y dashboard con CRUD)"
```

---

### Task 4: Frontend — eliminación de beneficios y código de descuento del paciente

**Files:**
- Delete: `medisxime-landing/src/components/admin/BeneficiosDashboard.tsx`
- Modify: `medisxime-landing/src/App.tsx` (solo QUITAR el import de BeneficiosDashboard y su ruta `/admin/benefits`; no tocar nada más)
- Modify: `medisxime-landing/src/components/admin/MembresiasDashboard.tsx`
- Modify: `medisxime-landing/src/components/user/UserMembresias.tsx`
- Modify: `medisxime-landing/src/components/user/UserMemberships.tsx`
- Modify: `medisxime-landing/src/components/user/UserServicios.tsx`

**Interfaces:**
- Consumes (contrato de Task 2): `POST /api/services/requests/bulk` acepta `discountCode?: string`; 400 `{ success:false, error }` si el código es inválido (la reserva no se crea); la respuesta/las reservas exponen `expectedAmount` y `discountPct` como hasta ahora.
- Produces: nada.

- [ ] **Step 1: Eliminar BeneficiosDashboard**

`git rm medisxime-landing/src/components/admin/BeneficiosDashboard.tsx`; en `App.tsx` quitar su import y el bloque `<Route path="/admin/benefits" ...>`.

- [ ] **Step 2: Limpiar planes (admin y paciente)**

- `MembresiasDashboard.tsx`: eliminar del formulario y de las tarjetas de plan todo campo/sección de beneficios y de descuento (%) — el plan queda: nombre, precio, descripción y lo no relacionado con beneficios. Eliminar fetches a `/api/benefits` si los hay.
- `UserMembresias.tsx` y `UserMemberships.tsx`: eliminar la visualización de beneficios/descuentos de los planes (listas de beneficios, "X% de descuento", clases gratis). Los planes muestran nombre, precio, descripción.
- Regla: si un dato viene del API que Task 2 dejó de enviar, se elimina su render; no inventar reemplazos.

- [ ] **Step 3: Código de descuento en el portal del paciente**

En `UserServicios.tsx`, en el paso de confirmación de reserva (donde se hace el `POST /api/services/requests/bulk`):

- Eliminar cualquier lógica de créditos/clases gratis/descuento de membresía en el cálculo o texto del precio mostrado.
- Agregar campo opcional: label "Código de descuento (opcional)", input de texto (mayúsculas automáticas con `value.toUpperCase()`), que se envía como `discountCode` en el body solo si no está vacío.
- Si el POST responde 400, mostrar `json.error` en el UI (sin crear la reserva); patrón de error visible ya existente en el archivo o banner rojo simple.

- [ ] **Step 4: Verificar y commitear**

Run: `cd medisxime-landing; pnpm build` → sin errores.
Run: `grep -rin "benefit\|beneficio" medisxime-landing/src/components/` → sin usos activos (textos genéricos de marketing en la landing pública NO cuentan; solo admin/user/professional).

```bash
git add -u medisxime-landing/src
git commit -m "refactor(frontend): fuera beneficios/descuentos viejos; codigo de descuento en reserva del paciente"
```

---

### Task 5: Verificación end-to-end (tras integrar Tasks 1–4)

**Files:** ninguno.

- [ ] **Step 1:** Migración 019 aplicada; `pnpm build` backend y frontend en la rama integrada.
- [ ] **Step 2:** CRUD por API (token ADMIN): crear percentage 20% automático, crear two_for_one con código `PROMO2X1` y límite por paciente 1, listar, editar, desactivar/activar. Código duplicado → 409.
- [ ] **Step 3:** `GET /api/discounts` sin token → 401.
- [ ] **Step 4:** Reserva bulk (token USER) de 2 sesiones sin código → `expectedAmount` con el 20% aplicado y `discountPct: 20`; `uses_count` del descuento incrementado; fila en `discount_redemptions`.
- [ ] **Step 5:** Reserva bulk con `discountCode: 'PROMO2X1'` (2 sesiones) → paga 1 sesión; repetir → 400 "Ya usaste este código el máximo de veces."
- [ ] **Step 6:** Código inexistente → 400 "Código inválido." y la reserva no se crea.
- [ ] **Step 7:** `GET /api/benefits` → 404.
- [ ] **Step 8:** Limpieza: eliminar descuentos, redenciones y reservas de prueba creados.
