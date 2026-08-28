import { test, beforeEach } from 'node:test'
import assert from 'node:assert'

process.env.DATABASE_URL ||= 'postgres://test:test@localhost:5432/test'
process.env.JWT_SECRET ||= 'clave-de-prueba-para-tests-32-caracteres-o-mas'

const { ProfessionalService } = await import('./professional.service.js')
const { ProfessionalRepository } = await import('../repositories/professional.repository.js')
const { UserRepository } = await import('../repositories/user.repository.js')
const { decryptSecret } = await import('../utils/crypto.util.js')

let captured: any

beforeEach(() => {
  captured = null
  ;(UserRepository as any).emailExists = async () => false
  ;(ProfessionalRepository as any).create = async (dto: any) => {
    captured = dto
    return { id: 'nuevo-id' }
  }
})

const base = {
  email: 'medico@medisxime.com',
  password: 'Password#123',
  firstName: 'Ana',
  lastName: 'Rojas',
}

test('rechaza roles distintos de ADMIN/PROFESSIONAL con 400', async () => {
  for (const role of ['USER', 'EMPRESA', 'COMPANY']) {
    await assert.rejects(
      () => ProfessionalService.create({ ...base, role } as any),
      (err: any) => err.statusCode === 400,
    )
  }
})

test('sin role crea PROFESSIONAL', async () => {
  await ProfessionalService.create({ ...base })
  assert.strictEqual(captured.role, 'PROFESSIONAL')
})

test('acepta role ADMIN', async () => {
  await ProfessionalService.create({ ...base, role: 'ADMIN' })
  assert.strictEqual(captured.role, 'ADMIN')
})

test('cifra la contraseña SISPRO antes de persistir', async () => {
  await ProfessionalService.create({ ...base, sisproPassword: 'ClaveSispro#9' })
  assert.ok(captured.sisproPasswordEnc)
  assert.notStrictEqual(captured.sisproPasswordEnc, 'ClaveSispro#9')
  assert.strictEqual(decryptSecret(captured.sisproPasswordEnc), 'ClaveSispro#9')
})

test('sin sisproPassword persiste null', async () => {
  await ProfessionalService.create({ ...base })
  assert.strictEqual(captured.sisproPasswordEnc, null)
})
