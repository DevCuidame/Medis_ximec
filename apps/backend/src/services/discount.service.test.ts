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
