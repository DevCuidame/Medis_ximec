# Spec — Rediseño de creación de cuentas (solo Admin / Profesional)

**Fecha**: 2026-07-15
**Estado**: Aprobado

## Objetivo

Rediseñar el modal "Nueva Cuenta" del panel admin para que solo permita crear
cuentas **Administrador** o **Médico Profesional**, con el set de campos definido
por la clínica (documento, nombres separados, dirección, teléfono, correo,
contraseña, registro médico y credenciales SISPRO), conservando intacta la
lógica de vinculación **dependiente / independiente** con su horario.

El registro público de pacientes (`POST /api/auth/register`) **no se modifica**.

## Campos requeridos (fuente: clínica)

| Campo                | Tipo          | Columna DB               | Obligatorio | Aplica a      |
|----------------------|---------------|--------------------------|-------------|---------------|
| Tipo de Documento    | Lista         | `id_type` (existe)       | Sí          | Ambos         |
| Número de Documento  | Número        | `id_number` (existe)     | Sí          | Ambos         |
| Primer Nombre        | Texto         | `first_name` (existe)    | Sí          | Ambos         |
| Segundo Nombre       | Texto         | `second_name` (nueva)    | No          | Ambos         |
| Primer Apellido      | Texto         | `last_name` (existe)     | Sí          | Ambos         |
| Segundo Apellido     | Texto         | `second_last_name` (nueva)| No         | Ambos         |
| Dirección Personal   | Alfanumérico  | `address` (nueva)        | No          | Ambos         |
| Teléfono Personal    | Alfanumérico  | `phone` (existe)         | Sí          | Ambos         |
| ROL                  | Lista         | `role` (existe)          | Sí          | ADMIN o PROFESSIONAL |
| Correo Electrónico   | Alfanumérico  | `email` (existe)         | Sí          | Ambos         |
| Contraseña           | Alfanumérico  | `password_hash` (existe) | Sí          | Ambos         |
| Registro Médico      | Alfanumérico  | `professional_license` (existe, mig. 016) | No | Solo PROFESSIONAL |
| Usuario SISPRO       | Alfanumérico  | `sispro_user` (nueva)    | No          | Solo PROFESSIONAL |
| Contraseña SISPRO    | Alfanumérico  | `sispro_password_enc` (nueva, cifrada) | No | Solo PROFESSIONAL |

Número de Documento se valida como **solo dígitos** en el frontend.

## Decisiones tomadas

1. **Contraseña SISPRO**: se guarda **cifrada y recuperable** (AES-256-GCM).
   Clave derivada de `SISPRO_SECRET` en `.env`; si no está definida, fallback a
   `JWT_SECRET`. No se hashea porque es una credencial de un sistema externo que
   el consultorio necesita consultar.
2. **Paso Perfil se conserva**: Especialidades (obligatorio), Biografía e
   Instagram siguen existiendo para profesionales, y ahí se agregan Registro
   Médico, Usuario SISPRO y Contraseña SISPRO.
3. **Admin sin campos médicos**: una cuenta ADMIN solo lleva identidad,
   contacto y acceso. Salta el paso Perfil (comportamiento actual de
   `visibleSteps`).
4. **Alcance del recorte de roles**: solo el modal admin y el endpoint
   `POST /api/professionals`. El registro público de pacientes sigue igual.
5. **Modelo de datos**: se extiende la tabla `users` (patrón de la migración
   016), no se crea tabla aparte.

## 1. Migración `apps/backend/migrations/017_professional_fields.sql`

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS second_name         VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS second_last_name    VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS address             VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS sispro_user         VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS sispro_password_enc TEXT;
```

`first_name`/`last_name` no se renombran: pasan a significar Primer Nombre /
Primer Apellido. Los registros existentes quedan válidos sin backfill.

## 2. Backend

### Cifrado (`src/utils/crypto.util.ts`)
- `encryptSecret(plain: string): string` y `decryptSecret(enc: string): string`
  con AES-256-GCM. Formato almacenado: `iv:tag:ciphertext` en base64/hex.
- Clave: SHA-256 de `env.SISPRO_SECRET ?? env.JWT_SECRET`.
- `env.ts`: agregar `SISPRO_SECRET` (opcional).

### `POST /api/professionals` (ADMIN)
- `role` aceptado: solo `'ADMIN' | 'PROFESSIONAL'`. Cualquier otro valor
  (incluido omitirlo con datos de empresa) → 400 "Rol no permitido".
  Default si se omite: `PROFESSIONAL`.
- Se elimina la rama de `ProfessionalService.create` que delegaba a
  `UserRepository.create` para roles USER/EMPRESA. La creación de ADMIN pasa
  por el mismo flujo con `role = 'ADMIN'` y sin campos médicos.
- `CreateProfessionalDTO` gana: `secondName?`, `secondLastName?`, `address?`,
  `professionalLicense?`, `sisproUser?`, `sisproPassword?`, `role?`.
- El repositorio persiste las columnas nuevas; `sisproPassword` se cifra con
  `encryptSecret` antes del INSERT.

### Lectura / exposición
- `GET /api/professionals` es **público** (sin `authenticate`), así que
  `ProfessionalPublic` solo gana campos no sensibles: `secondName`,
  `secondLastName`, `professionalLicense`. La dirección personal y los datos
  SISPRO **nunca** viajan en ese shape.
- Nuevo endpoint `GET /api/professionals/:id/admin-details` con
  `authenticate + authorize('ADMIN')`: devuelve `address`, `sisproUser` y
  `sisproPassword` descifrada, para consulta/edición desde el panel.
- `UPDATE` de profesional acepta los campos nuevos (misma regla de cifrado).

## 3. Frontend — `CreateProfessionalModal.tsx`

- **Tipo de cuenta**: select con solo `Médico Profesional` y `Administrador`.
  Se eliminan las opciones Paciente y Empresa y todo su código asociado
  (`companyName`, `legalRepresentative`, rama NIT, textos condicionales
  COMPANY/USER).
- **Paso 1 · Identidad**: Tipo de cuenta, Tipo de Documento (lista `ID_TYPES`
  actual + "Otro"), Número de Documento (input que solo acepta dígitos),
  Primer Nombre*, Segundo Nombre, Primer Apellido*, Segundo Apellido.
  El selector Dependiente/Independiente y su editor de horario se conservan
  **sin cambios** (solo visible para PROFESSIONAL; independiente exige ≥1
  bloque de horario, que se guarda vía `PUT /api/professionals/:id/schedule`).
- **Paso 2 · Contacto**: Correo Electrónico*, Teléfono Personal*, Dirección
  Personal (nuevo, opcional), foto por defecto (igual que hoy).
- **Paso 3 · Perfil** (solo PROFESSIONAL; ADMIN lo salta): Especialidades*
  (chips actuales), Biografía, Instagram, **Registro Médico**, **Usuario
  SISPRO**, **Contraseña SISPRO** (input con toggle ver/ocultar).
- **Paso 4 · Acceso**: sin cambios (contraseña, confirmación, resumen).
- **Submit**: envía los campos nuevos al `POST /api/professionals` con
  `role: 'ADMIN' | 'PROFESSIONAL'`.
- El placeholder "Ej: Aerial Hoop..." del input de nueva especialidad se
  corrige a un ejemplo médico.

## 4. Manejo de errores

- Backend valida rol permitido (400) y email duplicado (409, existente).
- Si `SISPRO_SECRET`/`JWT_SECRET` faltan al cifrar → error 500 controlado.
- Frontend: validación por paso como hoy (`validate(step)`), con dígitos-solo
  en Número de Documento y email/teléfono como hasta ahora.

## 5. Pruebas / verificación

- Migración corre limpia sobre una DB con datos (columnas `IF NOT EXISTS`).
- Crear PROFESSIONAL dependiente, PROFESSIONAL independiente (con horario) y
  ADMIN desde el modal; verificar registros en DB (incl. `sispro_password_enc`
  cifrada, no texto plano).
- `POST /api/professionals` con `role: 'USER'` o `'EMPRESA'` → 400.
- `GET /api/professionals/:id/admin-details` sin token ADMIN → 401/403; con
  token ADMIN devuelve la contraseña SISPRO original.
- `GET /api/professionals` (público) no incluye `address` ni campos SISPRO.
- Registro público de paciente sigue funcionando.

## Fuera de alcance

- Edición de credenciales SISPRO desde `ProfessionalProfileModal` (solo se
  deja el endpoint listo; la UI de edición puede venir después si se pide).
- Cambios en el registro público (`/api/auth/register`) o en cuentas EMPRESA
  existentes.
- Migrar datos de nombres existentes (quedan en `first_name`/`last_name`).
