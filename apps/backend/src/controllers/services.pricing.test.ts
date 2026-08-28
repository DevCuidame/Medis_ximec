import { test, beforeEach } from 'node:test'
import assert from 'node:assert'

process.env.DATABASE_URL ||= 'postgres://test:test@localhost:5432/test'
process.env.JWT_SECRET ||= 'clave-de-prueba-para-tests-32-caracteres-o-mas'

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
    id: 'offer-1', title: 'Salud Ocupacional — Consulta', price: 100000, capacity: 10, enrolledCount: 0, status: 'published',
    discipline: { name: 'Salud Ocupacional' },
  })
  ;(BookingRequestRepository as any).createGroupEnrollment = async (_ids: string[], _uid: string, opts: any) => {
    captured = opts
    return { id: 'req-1', ...opts, wasCreated: true }
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

test('especialidad se lee del título ("Categoría — Tipo"): descuento con specialty coincidente aplica', async () => {
  ;(ServiceOfferRepository as any).findById = async () => ({
    id: 'offer-2', title: 'Medicina Laboral — Consulta', price: 100000, capacity: 10, enrolledCount: 0, status: 'published',
    discipline: null,
  })
  ;(DiscountRepository as any).findAutomaticCandidates = async () => [{
    id: 'd2', name: 'Promo Laboral', kind: 'percentage', value: 10, code: null, specialty: 'Medicina Laboral',
    starts_at: null, ends_at: null, max_uses_total: null, max_uses_per_patient: null,
    uses_count: 0, is_active: true, created_at: new Date(), updated_at: new Date(),
  }]
  const res = fakeRes()
  await createBulkBookingRequests(req({ offerIds: ['offer-2'] }), res)
  assert.strictEqual(res.statusCode, 201)
  assert.strictEqual(captured.expectedAmount, 90000)
  assert.strictEqual(captured.discountPct, 10)
})

test('reserva ya existente (wasCreated: false): NO registra redención aunque el descuento aplique', async () => {
  ;(BookingRequestRepository as any).createGroupEnrollment = async (_ids: string[], _uid: string, opts: any) => {
    captured = opts
    return { id: 'req-1', ...opts, wasCreated: false }
  }
  ;(DiscountRepository as any).findAutomaticCandidates = async () => [{
    id: 'd1', name: 'Promo', kind: 'percentage', value: 20, code: null, specialty: null,
    starts_at: null, ends_at: null, max_uses_total: null, max_uses_per_patient: null,
    uses_count: 0, is_active: true, created_at: new Date(), updated_at: new Date(),
  }]
  const res = fakeRes()
  await createBulkBookingRequests(req({ offerIds: ['offer-1', 'offer-1'] }), res)
  assert.strictEqual(res.statusCode, 201)
  assert.strictEqual(redemption, null)
})

test('especialidad del título no coincide: el descuento no aplica', async () => {
  ;(ServiceOfferRepository as any).findById = async () => ({
    id: 'offer-2', title: 'Medicina Laboral — Consulta', price: 100000, capacity: 10, enrolledCount: 0, status: 'published',
    discipline: null,
  })
  ;(DiscountRepository as any).findAutomaticCandidates = async () => [{
    id: 'd3', name: 'Promo Otra', kind: 'percentage', value: 10, code: null, specialty: 'Otra Cosa',
    starts_at: null, ends_at: null, max_uses_total: null, max_uses_per_patient: null,
    uses_count: 0, is_active: true, created_at: new Date(), updated_at: new Date(),
  }]
  const res = fakeRes()
  await createBulkBookingRequests(req({ offerIds: ['offer-2'] }), res)
  assert.strictEqual(res.statusCode, 201)
  assert.strictEqual(captured.expectedAmount, 100000)
  assert.strictEqual(captured.discountPct, undefined)
})
