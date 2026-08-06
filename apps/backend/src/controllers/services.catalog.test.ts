import { test, beforeEach } from 'node:test'
import assert from 'node:assert'

process.env.DATABASE_URL ||= 'postgres://test:test@localhost:5432/test'
process.env.JWT_SECRET ||= 'clave-de-prueba'

const { createOffer } = await import('./services.controller.js')
const { ServiceOfferRepository } = await import('../repositories/services.repository.js')

function fakeRes() {
  const res: any = { statusCode: 200, body: null }
  res.status = (c: number) => { res.statusCode = c; return res }
  res.json = (b: unknown) => { res.body = b; return res }
  return res
}

let captured: any
beforeEach(() => {
  captured = null
  ;(ServiceOfferRepository as any).create = async (payload: any) => { captured = payload; return { id: 'o1', ...payload } }
})

function req(body: Record<string, unknown>) {
  return { user: { id: 'admin1', email: 'a@b.co', role: 'ADMIN' }, body } as any
}

const base = {
  locationId: 'loc-1', offerType: 'appointment', title: 'Consulta de Medicina Laboral',
  durationMinutes: 45, price: 120000,
}

test('catálogo válido → 201 con defaults (capacity 1, scheduledAt null) y cups en MAYÚSCULAS', async () => {
  const res = fakeRes()
  await createOffer(req({ ...base, serviceGroup: '01', cups: 'ab12cd', modalities: ['01', '04'], specialty: 'Medicina Laboral' }), res)
  assert.strictEqual(res.statusCode, 201)
  assert.strictEqual(captured.capacity, 1)
  assert.strictEqual(captured.scheduledAt ?? null, null)
  assert.strictEqual(captured.cups, 'AB12CD')
})

test('title vacío → 400', async () => {
  const res = fakeRes()
  await createOffer(req({ ...base, title: '  ' }), res)
  assert.strictEqual(res.statusCode, 400)
})

test('serviceGroup desconocido → 400', async () => {
  const res = fakeRes()
  await createOffer(req({ ...base, serviceGroup: '07' }), res)
  assert.strictEqual(res.statusCode, 400)
})

test('cups inválido → 400', async () => {
  for (const bad of ['12345', '1234567', 'AB-123']) {
    const res = fakeRes()
    await createOffer(req({ ...base, cups: bad }), res)
    assert.strictEqual(res.statusCode, 400, `debió rechazar "${bad}"`)
  }
})

test('modalidad desconocida → 400 (07 no existe)', async () => {
  const res = fakeRes()
  await createOffer(req({ ...base, modalities: ['01', '07'] }), res)
  assert.strictEqual(res.statusCode, 400)
})

test('durationMinutes 0 → 400; price negativo → 400', async () => {
  let res = fakeRes()
  await createOffer(req({ ...base, durationMinutes: 0 }), res)
  assert.strictEqual(res.statusCode, 400)
  res = fakeRes()
  await createOffer(req({ ...base, price: -1 }), res)
  assert.strictEqual(res.statusCode, 400)
})
