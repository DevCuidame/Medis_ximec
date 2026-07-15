import { test } from 'node:test'
import assert from 'node:assert'

process.env.JWT_SECRET ||= 'clave-de-prueba'

const { encryptSecret, decryptSecret } = await import('./crypto.util.js')

test('encryptSecret/decryptSecret: roundtrip devuelve el original', () => {
  const enc = encryptSecret('MiClaveSISPRO#2026')
  assert.strictEqual(decryptSecret(enc), 'MiClaveSISPRO#2026')
})

test('encryptSecret no guarda texto plano y usa formato iv:tag:data', () => {
  const enc = encryptSecret('secreto')
  assert.ok(!enc.includes('secreto'))
  assert.strictEqual(enc.split(':').length, 3)
})

test('encryptSecret genera IV distinto en cada llamada', () => {
  assert.notStrictEqual(encryptSecret('igual'), encryptSecret('igual'))
})

test('decryptSecret lanza si el dato fue alterado', () => {
  const enc = encryptSecret('secreto')
  const [iv, tag, _data] = enc.split(':')
  const tampered = `${iv}:${tag}:${Buffer.from('xxxxxxxx').toString('base64')}`
  assert.throws(() => decryptSecret(tampered))
})
