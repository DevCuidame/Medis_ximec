import crypto from 'node:crypto'

// Iteraciones PBKDF2: 600_000 es la recomendación actual de OWASP para
// PBKDF2-HMAC-SHA256 (310_000 era la de 2021). Los hashes existentes se
// guardaron como "salt:hash" con 310_000 iteraciones implícitas — el prefijo
// "pbkdf2$<iter>$" en los hashes nuevos permite subir el costo a futuro sin
// invalidar cuentas ya creadas (login sigue verificando con el iterCount
// original de cada hash).
const CURRENT_ITERATIONS = 600_000
const LEGACY_ITERATIONS = 310_000

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, CURRENT_ITERATIONS, 32, 'sha256').toString('hex')
  return `pbkdf2$${CURRENT_ITERATIONS}$${salt}$${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  let iterations: number
  let salt: string
  let hash: string

  if (stored.startsWith('pbkdf2$')) {
    const parts = stored.split('$')
    iterations = Number(parts[1])
    salt = parts[2]
    hash = parts[3]
  } else {
    // Formato legacy sin prefijo: "salt:hash" @ 310_000 iteraciones.
    iterations = LEGACY_ITERATIONS
    ;[salt, hash] = stored.split(':')
  }

  const candidate = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('hex')
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(candidate, 'hex'))
}

// ─── Cifrado reversible para credenciales externas (SISPRO) ─────────────────
// Se lee process.env directamente (y no config/env) para no exigir
// DATABASE_URL al importar este módulo en tests.
function sisproKey(): Buffer {
  const secret = process.env.SISPRO_SECRET || process.env.JWT_SECRET
  if (!secret) {
    throw Object.assign(
      new Error('SISPRO_SECRET o JWT_SECRET requerido para cifrar credenciales.'),
      { statusCode: 500 },
    )
  }
  return crypto.createHash('sha256').update(secret).digest()
}

/** Cifra un secreto con AES-256-GCM. Formato: iv:tag:ciphertext (base64). */
export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', sisproKey(), iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return `${iv.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${enc.toString('base64')}`
}

/** Descifra un secreto guardado por encryptSecret. */
export function decryptSecret(stored: string): string {
  const [ivB64, tagB64, dataB64] = stored.split(':')
  const decipher = crypto.createDecipheriv('aes-256-gcm', sisproKey(), Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]).toString('utf8')
}
