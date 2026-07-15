# Rediseño de creación de cuentas (Admin/Profesional) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** El modal "Nueva Cuenta" del admin solo crea cuentas ADMIN o PROFESSIONAL con los campos de la clínica (documento, nombres separados, dirección, registro médico, SISPRO), y el backend persiste/protege esos campos.

**Architecture:** Se extiende la tabla `users` (migración 017) siguiendo el patrón de la 016. La contraseña SISPRO se cifra con AES-256-GCM (recuperable, solo vía endpoint ADMIN). El flujo `Routes → Controllers → Services → Repositories` existente se amplía; en el frontend se modifica únicamente `CreateProfessionalModal.tsx` (usado por `UsuariosDashboard` y `AdminProfessionals`).

**Tech Stack:** Express 4 + pg, node:test vía `tsx --test`, React 19 + Vite.

**Spec:** `docs/superpowers/specs/2026-07-15-professional-account-creation-design.md`

## Global Constraints

- El registro público de pacientes (`POST /api/auth/register`) NO se toca.
- La lógica dependiente/independiente y el editor de horario del modal se conservan sin cambios funcionales.
- `GET /api/professionals` (público) nunca expone `address`, `sispro_user` ni `sispro_password_enc`.
- Respuestas API: `{ success: true, data: {...} }` / `{ success: false, error: 'mensaje' }`.
- Textos de UI en español formal, temática médica (sin referencias a danza).
- Número de Documento: solo dígitos en el frontend.

## Ejecución en paralelo

- **Agente Backend**: Task 1 → Task 2 (secuencial, mismo agente).
- **Agente Frontend**: Task 3 (independiente; solo consume el contrato JSON descrito en "Interfaces" de Task 2 — no necesita que el backend esté implementado para compilar).
- Archivos disjuntos: no hay conflictos de merge esperados.

---

### Task 1: Migración 017 + cifrado SISPRO

**Files:**
- Create: `apps/backend/migrations/017_professional_fields.sql`
- Modify: `apps/backend/src/config/env.ts`
- Modify: `apps/backend/src/utils/crypto.util.ts`
- Verify: `apps/backend/src/utils/index.ts` re-exporta crypto.util (si no, agregar)
- Test: `apps/backend/src/utils/crypto.util.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `encryptSecret(plain: string): string` y `decryptSecret(stored: string): string` exportadas desde `@utils/index.js`. Formato almacenado: `iv:tag:ciphertext` (base64). Columnas nuevas en `users`: `second_name`, `second_last_name`, `address`, `sispro_user`, `sispro_password_enc`.

- [ ] **Step 1: Crear la migración**

`apps/backend/migrations/017_professional_fields.sql`:

```sql
-- ============================================================
-- Migration 017: Professional fields (nombres separados,
-- dirección, credenciales SISPRO)
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS second_name         VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS second_last_name    VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS address             VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS sispro_user         VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS sispro_password_enc TEXT;
```

- [ ] **Step 2: Correr la migración**

Run: `pnpm -F @medisxime/backend migrate`
Expected: termina sin error e indica la 017 aplicada (las anteriores se saltan/ya aplicadas).

- [ ] **Step 3: Agregar `SISPRO_SECRET` a env.ts**

En `apps/backend/src/config/env.ts`, agregar a la interface `Env`:

```ts
  SISPRO_SECRET: string;
```

y al objeto `env`:

```ts
  SISPRO_SECRET: process.env.SISPRO_SECRET || '',
```

(No es variable requerida: el cifrado cae a `JWT_SECRET` si falta.)

- [ ] **Step 4: Escribir el test que falla**

`apps/backend/src/utils/crypto.util.test.ts`:

```ts
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
  const [iv, tag, data] = enc.split(':')
  const tampered = `${iv}:${tag}:${Buffer.from('xxxxxxxx').toString('base64')}`
  assert.throws(() => decryptSecret(tampered))
})
```

- [ ] **Step 5: Verificar que falla**

Run (desde `apps/backend/`): `npx tsx --test src/utils/crypto.util.test.ts`
Expected: FAIL — `encryptSecret` no existe / no es una función.

- [ ] **Step 6: Implementar en crypto.util.ts**

Agregar al final de `apps/backend/src/utils/crypto.util.ts`:

```ts
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
```

Verificar que `apps/backend/src/utils/index.ts` haga `export * from './crypto.util.js'` (patrón existente para `hashPassword`); si exporta símbolos individuales, agregar `encryptSecret` y `decryptSecret`.

- [ ] **Step 7: Verificar que pasa**

Run (desde `apps/backend/`): `npx tsx --test src/utils/crypto.util.test.ts`
Expected: 4 tests PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/backend/migrations/017_professional_fields.sql apps/backend/src/config/env.ts apps/backend/src/utils/crypto.util.ts apps/backend/src/utils/crypto.util.test.ts apps/backend/src/utils/index.ts
git commit -m "feat(backend): migración 017 y cifrado AES-GCM para credenciales SISPRO"
```

---

### Task 2: Backend — tipos, repositorio, servicio, controlador y rutas

**Files:**
- Modify: `apps/backend/src/types/professional.types.ts`
- Modify: `apps/backend/src/repositories/professional.repository.ts`
- Modify: `apps/backend/src/services/professional.service.ts`
- Modify: `apps/backend/src/controllers/professional.controller.ts`
- Modify: `apps/backend/src/routes/professional.routes.ts`
- Test: `apps/backend/src/services/professional.service.test.ts`

**Interfaces:**
- Consumes: `encryptSecret`/`decryptSecret` de Task 1 (`@utils/index.js`).
- Produces (contrato que consume el frontend de Task 3):
  - `POST /api/professionals` acepta body `{ email, password, role?: 'PROFESSIONAL' | 'ADMIN', firstName, secondName?, lastName, secondLastName?, idType?, idNumber?, phone?, address?, avatarUrl?, bio?, specialties?, instagramUrl?, professionalType?, professionalLicense?, sisproUser?, sisproPassword? }`. Cualquier otro `role` → 400 `"Rol no permitido. Solo se pueden crear cuentas ADMIN o PROFESSIONAL."`. Respuesta 201: `{ success: true, data: { professional } }` (para ambos roles).
  - `GET /api/professionals/:id/admin-details` (ADMIN) → `{ success: true, data: { details: { address, sisproUser, sisproPassword } } }` con la contraseña descifrada.

- [ ] **Step 1: Actualizar tipos**

En `apps/backend/src/types/professional.types.ts`:

`ProfessionalRecord` — agregar después de `last_name`:

```ts
  second_name:         string | null
  second_last_name:    string | null
```

y después de `id_number`:

```ts
  address:              string | null
  professional_license: string | null
  sispro_user:          string | null
  sispro_password_enc:  string | null
```

`ProfessionalPublic` — agregar después de `lastName` y de `idNumber` respectivamente:

```ts
  secondName:          string | null
  secondLastName:      string | null
  professionalLicense: string | null
```

(`address`, `sisproUser` y la contraseña NO van en `ProfessionalPublic`: el listado es público.)

`CreateProfessionalDTO` — agregar:

```ts
  role?:               'PROFESSIONAL' | 'ADMIN'
  secondName?:         string
  secondLastName?:     string
  address?:            string
  professionalLicense?: string
  sisproUser?:         string
  sisproPassword?:     string
```

`UpdateProfessionalDTO` — agregar:

```ts
  secondName?:         string
  secondLastName?:     string
  address?:            string
  professionalLicense?: string
  sisproUser?:         string
  sisproPassword?:     string
```

Nuevo tipo al final de la sección de DTOs:

```ts
export interface ProfessionalAdminDetails {
  address:        string | null
  sisproUser:     string | null
  sisproPassword: string | null
}
```

- [ ] **Step 2: Escribir el test del servicio (falla)**

`apps/backend/src/services/professional.service.test.ts`:

```ts
import { test, beforeEach } from 'node:test'
import assert from 'node:assert'

process.env.DATABASE_URL ||= 'postgres://test:test@localhost:5432/test'
process.env.JWT_SECRET ||= 'clave-de-prueba'

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
```

- [ ] **Step 3: Verificar que falla**

Run (desde `apps/backend/`): `npx tsx --test src/services/professional.service.test.ts`
Expected: FAIL — el servicio actual no valida rol ni pasa `role`/`sisproPasswordEnc` al repositorio.

- [ ] **Step 4: Reescribir `ProfessionalService.create` y agregar `getAdminDetails`**

En `apps/backend/src/services/professional.service.ts`:

- Quitar los imports de `UserPublic` y dejar `UserRepository` (se sigue usando para `emailExists`).
- Importar `encryptSecret`, `decryptSecret` desde `@utils/index.js` y `ProfessionalAdminDetails` desde los tipos.

Reemplazar `create` por:

```ts
  async create(dto: CreateProfessionalDTO): Promise<ProfessionalPublic> {
    const role = dto.role ?? 'PROFESSIONAL'
    if (role !== 'PROFESSIONAL' && role !== 'ADMIN') {
      throw Object.assign(
        new Error('Rol no permitido. Solo se pueden crear cuentas ADMIN o PROFESSIONAL.'),
        { statusCode: 400 },
      )
    }

    const exists = await UserRepository.emailExists(dto.email)
    if (exists) throw Object.assign(new Error('El email ya está registrado.'), { statusCode: 409 })

    const passwordHash = hashPassword(dto.password)
    const sisproPasswordEnc = dto.sisproPassword ? encryptSecret(dto.sisproPassword) : null
    return ProfessionalRepository.create({ ...dto, role, passwordHash, sisproPasswordEnc })
  },
```

(El tipo de retorno del método deja de ser `ProfessionalPublic | UserPublic`.)

Agregar método:

```ts
  async getAdminDetails(id: string): Promise<ProfessionalAdminDetails> {
    const row = await ProfessionalRepository.findAdminDetails(id)
    if (!row) throw Object.assign(new Error('Profesional no encontrado.'), { statusCode: 404 })
    return {
      address:        row.address,
      sisproUser:     row.sisproUser,
      sisproPassword: row.sisproPasswordEnc ? decryptSecret(row.sisproPasswordEnc) : null,
    }
  },
```

En `update`, cifrar si llega `sisproPassword`:

```ts
  async update(id: string, dto: UpdateProfessionalDTO): Promise<ProfessionalPublic> {
    const { sisproPassword, ...rest } = dto
    const payload = {
      ...rest,
      ...(sisproPassword !== undefined
        ? { sisproPasswordEnc: sisproPassword ? encryptSecret(sisproPassword) : null }
        : {}),
    }
    const updated = await ProfessionalRepository.update(id, payload)
    if (!updated) throw Object.assign(new Error('Profesional no encontrado.'), { statusCode: 404 })
    return updated
  },
```

- [ ] **Step 5: Actualizar el repositorio**

En `apps/backend/src/repositories/professional.repository.ts`:

`toPublic` — agregar:

```ts
    secondName:          r.second_name,
    secondLastName:      r.second_last_name,
    professionalLicense: r.professional_license,
```

Reemplazar `create` por:

```ts
  /** Create an ADMIN or PROFESSIONAL account */
  async create(
    dto: CreateProfessionalDTO & {
      passwordHash: string
      role: 'PROFESSIONAL' | 'ADMIN'
      sisproPasswordEnc: string | null
    },
  ): Promise<ProfessionalPublic> {
    const { rows } = await pool.query<ProfessionalRecord>(`
      INSERT INTO users
        (email, password_hash, first_name, second_name, last_name, second_last_name,
         phone, address, role, id_type, id_number, professional_license,
         sispro_user, sispro_password_enc,
         bio, specialties, instagram_url, avatar_url, status, is_verified, professional_type)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,'offline',TRUE,$19)
      RETURNING *,
        NULL::NUMERIC AS avg_score,
        NULL::BIGINT  AS total_reviews
    `, [
      dto.email.toLowerCase().trim(),
      dto.passwordHash,
      dto.firstName.trim(),
      dto.secondName?.trim() || null,
      dto.lastName.trim(),
      dto.secondLastName?.trim() || null,
      dto.phone?.trim() ?? null,
      dto.address?.trim() || null,
      dto.role,
      dto.idType?.trim() ?? null,
      dto.idNumber?.trim() ?? null,
      dto.professionalLicense?.trim() || null,
      dto.sisproUser?.trim() || null,
      dto.sisproPasswordEnc,
      dto.bio?.trim() ?? null,
      dto.specialties ?? null,
      dto.instagramUrl?.trim() ?? null,
      dto.avatarUrl?.trim() ?? null,
      dto.professionalType ?? 'dependiente',
    ])
    return toPublic(rows[0])
  },
```

Agregar en `update` (junto a los demás campos):

```ts
    if (dto.secondName          !== undefined) { fields.push(`second_name          = $${idx++}`); values.push(dto.secondName?.trim() || null) }
    if (dto.secondLastName      !== undefined) { fields.push(`second_last_name     = $${idx++}`); values.push(dto.secondLastName?.trim() || null) }
    if (dto.address             !== undefined) { fields.push(`address              = $${idx++}`); values.push(dto.address?.trim() || null) }
    if (dto.professionalLicense !== undefined) { fields.push(`professional_license = $${idx++}`); values.push(dto.professionalLicense?.trim() || null) }
    if (dto.sisproUser          !== undefined) { fields.push(`sispro_user          = $${idx++}`); values.push(dto.sisproUser?.trim() || null) }
    if ((dto as any).sisproPasswordEnc !== undefined) { fields.push(`sispro_password_enc = $${idx++}`); values.push((dto as any).sisproPasswordEnc) }
```

(La firma de `update` pasa a `dto: UpdateProfessionalDTO & { sisproPasswordEnc?: string | null }` para evitar el `as any`.)

Agregar método:

```ts
  /** Datos sensibles solo-ADMIN (dirección + credenciales SISPRO) */
  async findAdminDetails(id: string): Promise<{ address: string | null; sisproUser: string | null; sisproPasswordEnc: string | null } | null> {
    const { rows } = await pool.query(
      `SELECT address, sispro_user, sispro_password_enc
       FROM users
       WHERE id = $1 AND role IN ('PROFESSIONAL', 'ADMIN')
       LIMIT 1`,
      [id],
    )
    if (!rows[0]) return null
    return {
      address:           rows[0].address,
      sisproUser:        rows[0].sispro_user,
      sisproPasswordEnc: rows[0].sispro_password_enc,
    }
  },
```

- [ ] **Step 6: Controlador y ruta admin-details**

En `apps/backend/src/controllers/professional.controller.ts` agregar:

```ts
// ─── GET /api/professionals/:id/admin-details ────────────────────────────────
export async function getAdminDetails(req: Request, res: Response): Promise<void> {
  try {
    const details = await ProfessionalService.getAdminDetails(req.params.id)
    res.status(200).json({ success: true, data: { details } })
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ success: false, error: err.message })
  }
}
```

En `apps/backend/src/routes/professional.routes.ts`, importar `getAdminDetails` y agregar **antes** de `router.get('/:id', ...)`:

```ts
router.get('/:id/admin-details', authenticate, authorize('ADMIN'), getAdminDetails)
```

- [ ] **Step 7: Verificar tests y compilación**

Run (desde `apps/backend/`):
- `npx tsx --test src/services/professional.service.test.ts src/utils/crypto.util.test.ts` → Expected: todos PASS.
- `pnpm -F @medisxime/backend build` → Expected: `tsc` sin errores.

- [ ] **Step 8: Commit**

```bash
git add apps/backend/src
git commit -m "feat(backend): creación solo ADMIN/PROFESSIONAL con campos de clínica y SISPRO cifrado"
```

---

### Task 3: Frontend — rediseño de `CreateProfessionalModal`

**Files:**
- Modify: `medisxime-landing/src/components/admin/CreateProfessionalModal.tsx`

**Interfaces:**
- Consumes (contrato de Task 2, ya definido — el frontend compila sin backend):
  `POST /api/professionals` con body `{ email, password, role: 'PROFESSIONAL' | 'ADMIN', firstName, secondName?, lastName, secondLastName?, idType, idNumber, phone, address?, avatarUrl, bio?, specialties?, instagramUrl?, professionalType?, professionalLicense?, sisproUser?, sisproPassword? }` → 201 `{ success: true, data: { professional } }`.
  `PUT /api/professionals/:id/schedule` con `{ slots }` (sin cambios).
- Produces: mismo componente `CreateProfessionalModal({ onClose, onSuccess })` — sin cambio de props, `UsuariosDashboard.tsx` y `AdminProfessionals.tsx` no se tocan.

No hay framework de tests en el frontend: la verificación es `pnpm build` (tsc) + smoke manual.

- [ ] **Step 1: Restringir roles y limpiar tipos**

En `CreateProfessionalModal.tsx`:

```ts
type AccountRole = 'PROFESSIONAL' | 'ADMIN'
```

`FormData` queda:

```ts
interface FormData {
  firstName: string; secondName: string; lastName: string; secondLastName: string
  idType: string; idNumber: string
  email: string; phone: string; address: string
  specialties: string[]; bio: string; instagramUrl: string
  professionalLicense: string; sisproUser: string; sisproPassword: string
  password: string; confirmPassword: string
}
```

Estado inicial:

```ts
  const [form, setForm] = useState<FormData>({
    firstName: '', secondName: '', lastName: '', secondLastName: '',
    idType: ID_TYPES[0], idNumber: '',
    email: '', phone: '', address: '',
    specialties: [], bio: '', instagramUrl: '',
    professionalLicense: '', sisproUser: '', sisproPassword: '',
    password: '', confirmPassword: '',
  })
```

Agregar estado para el toggle de la contraseña SISPRO junto a `showPass`/`showConf`:

```ts
  const [showSispro, setShowSispro] = useState(false)
```

Eliminar: `companyName`, `legalRepresentative` (del interface, estado inicial y todo uso).

- [ ] **Step 2: Select de tipo de cuenta con solo 2 opciones**

En el paso 1, el `<select>` de "Tipo de cuenta" queda con:

```tsx
                    <option value="PROFESSIONAL">Médico Profesional</option>
                    <option value="ADMIN">Administrador</option>
```

(se eliminan `USER` y `COMPANY`). Eliminar del JSX del paso 1 toda la rama `role === 'COMPANY'` (Razón Social / Representante Legal) dejando solo los inputs de nombres, y en el select de Tipo de Identificación quitar los condicionales `role === 'COMPANY'` (queda el select simple con `ID_TYPES` + input de "Otro").

- [ ] **Step 3: Nombres separados (grid 2×2)**

Reemplazar el grid de Nombres/Apellidos del paso 1 por cuatro campos (mismo estilo `INPUT`/`LABEL`/`ERR`, mismo patrón `onChange`/`onFocus`/`onBlur` que los actuales):

- **Primer Nombre*** → `form.firstName`, placeholder `"Ej. María"`
- **Segundo Nombre** → `form.secondName`, placeholder `"Ej. Fernanda (opcional)"`
- **Primer Apellido*** → `form.lastName`, placeholder `"Ej. González"`
- **Segundo Apellido** → `form.secondLastName`, placeholder `"Ej. Pérez (opcional)"`

Contenedor: `display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14` (dos filas).

- [ ] **Step 4: Número de Documento solo dígitos**

En el input de Número de Identificación:

```tsx
                    <input
                      type="text" inputMode="numeric" value={form.idNumber} placeholder="Ej. 1012345678"
                      onChange={e => { set('idNumber', e.target.value.replace(/\D/g, '')) ; clearErr('idNumber') }}
```

(el resto de props igual que hoy; quitar el placeholder condicional de COMPANY).

- [ ] **Step 5: Paso 2 — Dirección Personal**

Después del bloque de Teléfono y antes de la Foto, agregar:

```tsx
                {/* Dirección */}
                <div>
                  <label style={LABEL}>Dirección Personal</label>
                  <input
                    type="text" value={form.address} placeholder="Ej. Cra 15 # 82-30, Bogotá"
                    onChange={e => set('address', e.target.value)}
                    onFocus={e => (e.target.style.borderColor = C.gold)}
                    onBlur={e => (e.target.style.borderColor = C.border)}
                    style={INPUT()}
                  />
                </div>
```

Quitar el placeholder condicional de COMPANY en el email (queda `"juan.perez@correo.com"`).

- [ ] **Step 6: Paso 3 — Registro Médico y SISPRO**

Después del bloque de Instagram (y antes del bloque de horario de independiente), agregar:

```tsx
                {/* Registro Médico */}
                <div>
                  <label style={LABEL}>Registro Médico</label>
                  <input
                    type="text" value={form.professionalLicense} placeholder="Ej. RM-123456"
                    onChange={e => set('professionalLicense', e.target.value)}
                    onFocus={e => (e.target.style.borderColor = C.gold)}
                    onBlur={e => (e.target.style.borderColor = C.border)}
                    style={INPUT()}
                  />
                </div>

                {/* SISPRO */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={LABEL}>Usuario SISPRO</label>
                    <input
                      type="text" value={form.sisproUser} placeholder="Usuario del portal"
                      onChange={e => set('sisproUser', e.target.value)}
                      onFocus={e => (e.target.style.borderColor = C.gold)}
                      onBlur={e => (e.target.style.borderColor = C.border)}
                      style={INPUT()}
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <label style={LABEL}>Contraseña SISPRO</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showSispro ? 'text' : 'password'} value={form.sisproPassword} placeholder="Clave del portal"
                        onChange={e => set('sisproPassword', e.target.value)}
                        onFocus={e => (e.target.style.borderColor = C.gold)}
                        onBlur={e => (e.target.style.borderColor = C.border)}
                        style={{ ...INPUT(), paddingRight: 42 }}
                        autoComplete="new-password"
                      />
                      <button type="button" onClick={() => setShowSispro(v => !v)}
                        style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, padding: 0 }}>
                        {showSispro ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
```

Corregir el placeholder del input de nueva especialidad: `"Ej: Aerial Hoop..."` → `"Ej. Medicina del Trabajo..."`.

- [ ] **Step 7: Validación y submit**

En `validate(1)`, eliminar la rama COMPANY; queda:

```ts
      if (!form.firstName.trim())  e.firstName = 'Requerido'
      if (!form.lastName.trim())   e.lastName  = 'Requerido'
      if (form.idType === 'Otro' && !customIdType.trim()) e.idType = 'Requerido'
      if (!form.idNumber.trim())   e.idNumber  = 'Requerido'
```

(la validación de horario para independiente se conserva tal cual).

En `submit`, el body queda:

```ts
        body: JSON.stringify({
          email:            form.email.toLowerCase().trim(),
          password:         form.password,
          role,
          firstName:        form.firstName.trim(),
          secondName:       form.secondName.trim()     || undefined,
          lastName:         form.lastName.trim(),
          secondLastName:   form.secondLastName.trim() || undefined,
          idType:           form.idType === 'Otro' ? customIdType.trim() : form.idType,
          idNumber:         form.idNumber.trim(),
          phone:            form.phone.trim()          || undefined,
          address:          form.address.trim()        || undefined,
          avatarUrl:        DEFAULT_AVATAR_URL,
          bio:              form.bio.trim()            || undefined,
          specialties:      form.specialties.length ? form.specialties : undefined,
          instagramUrl:     form.instagramUrl.trim()   || undefined,
          professionalType: role === 'PROFESSIONAL' ? professionalType : undefined,
          professionalLicense: role === 'PROFESSIONAL' ? form.professionalLicense.trim() || undefined : undefined,
          sisproUser:          role === 'PROFESSIONAL' ? form.sisproUser.trim()          || undefined : undefined,
          sisproPassword:      role === 'PROFESSIONAL' ? form.sisproPassword             || undefined : undefined,
        }),
```

- [ ] **Step 8: Textos restantes**

- Resumen del paso 4: `{`${form.firstName} ${form.lastName}`.trim() || 'Nuevo Usuario'}` (quitar la rama COMPANY).
- Botón final: `Crear {role === 'ADMIN' ? 'Administrador' : 'Profesional'}` (quitar ramas USER/COMPANY).

- [ ] **Step 9: Verificar compilación**

Run: `cd medisxime-landing; pnpm build`
Expected: `tsc` + `vite build` sin errores. Además `grep -n "COMPANY\|companyName\|legalRepresentative" src/components/admin/CreateProfessionalModal.tsx` no devuelve nada.

- [ ] **Step 10: Commit**

```bash
git add medisxime-landing/src/components/admin/CreateProfessionalModal.tsx
git commit -m "feat(admin): modal de cuentas solo Admin/Profesional con campos de clínica y SISPRO"
```

---

### Task 4: Verificación end-to-end (tras merge de Tasks 1–3)

**Files:** ninguno (solo verificación).

- [ ] **Step 1: Levantar el entorno** — `pnpm dev` (backend 3009 + frontend 5173).
- [ ] **Step 2: Crear un PROFESSIONAL dependiente** desde `/admin/users` → Nuevo Usuario, llenando documento, cuatro nombres, dirección, registro médico y SISPRO. Expected: aparece en la lista.
- [ ] **Step 3: Crear un PROFESSIONAL independiente** con ≥1 bloque de horario. Expected: `GET /api/professionals/:id/schedule` devuelve los bloques.
- [ ] **Step 4: Crear un ADMIN** — el wizard salta el paso Perfil (3 pasos visibles). Expected: usuario con rol Admin en la lista.
- [ ] **Step 5: Verificar cifrado en DB** — `SELECT sispro_password_enc FROM users WHERE sispro_user IS NOT NULL;` Expected: formato `iv:tag:data`, sin texto plano.
- [ ] **Step 6: Verificar restricción de rol** — `POST /api/professionals` con `role: 'USER'` (token ADMIN). Expected: 400.
- [ ] **Step 7: Verificar admin-details** — `GET /api/professionals/:id/admin-details` sin token → 401; con token ADMIN → contraseña SISPRO original.
- [ ] **Step 8: Verificar registro público** — `POST /api/auth/register` de un paciente sigue devolviendo 201.
- [ ] **Step 9: Verificar listado público** — `GET /api/professionals` sin token: la respuesta NO contiene `address` ni `sispro`.
