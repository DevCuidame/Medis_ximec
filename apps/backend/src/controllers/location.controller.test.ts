import { test, beforeEach } from 'node:test'
import assert from 'node:assert'

process.env.DATABASE_URL ||= 'postgres://test:test@localhost:5432/test'
process.env.JWT_SECRET ||= 'clave-de-prueba-para-tests-32-caracteres-o-mas'

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
