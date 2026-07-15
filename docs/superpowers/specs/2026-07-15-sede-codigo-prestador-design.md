# Spec — Campo obligatorio "Código de Prestador" en Sedes

**Fecha**: 2026-07-15
**Estado**: Aprobado

## Objetivo

Agregar a las sedes (locations) un campo **Código de Prestador** (código REPS de
habilitación, solo dígitos), obligatorio al crear una sede y al editar cualquier
sede que aún no lo tenga. Se muestra en la tarjeta de cada sede.

## Decisiones tomadas

1. **Formato**: solo dígitos, entre 8 y 12 (`/^\d{8,12}$/`).
2. **Sedes existentes** (Laureles, Poblado): la columna en DB es **nullable** —
   siguen válidas sin código; el formulario lo exige al editarlas. No se
   inventan códigos de backfill (dato regulatorio).
3. **Visibilidad**: la tarjeta del listado muestra `Prestador: <código>`; si la
   sede vieja no tiene, muestra `— sin código —`.

## 1. DB — `apps/backend/migrations/018_location_provider_code.sql`

```sql
ALTER TABLE locations ADD COLUMN IF NOT EXISTS provider_code VARCHAR(20);
```

## 2. Backend

- `LocationPublic` (en `apps/backend/src/repositories/location.repository.ts`)
  gana `providerCode?: string | null`.
- `findAll` incluye `provider_code AS "providerCode"`; `create` lo inserta;
  `update` lo actualiza cuando viene definido.
- Validación en `apps/backend/src/controllers/location.controller.ts`:
  - `POST /api/locations`: si `providerCode` falta o no cumple `/^\d{8,12}$/` →
    400 `"Código de prestador requerido (8 a 12 dígitos)."`.
  - `PUT /api/locations/:id`: si el body **incluye** `providerCode`, se valida
    con la misma regla (si no viene, no se toca el valor guardado).
- Test (node:test, patrón de los existentes): la función de validación o el
  flujo del controlador rechaza vacío/letras/corto y acepta 10 dígitos.

## 3. Frontend

- `medisxime-landing/src/lib/schemas/sedeSchema.ts`:
  `providerCode: z.string().regex(/^\d{8,12}$/, "Código de prestador requerido (8 a 12 dígitos)")`.
- `medisxime-landing/src/components/admin/FormularioSede.tsx`: campo
  **"Código de Prestador *"** en la sección Información General (tras Ciudad),
  input con `inputMode="numeric"` que descarta no-dígitos al escribir
  (`value.replace(/\D/g, '')`), placeholder `"Ej. 0500123456"`. `initialData`
  de sedes viejas llega sin código → el schema obliga a completarlo al editar.
- `medisxime-landing/src/components/admin/SedesDashboard.tsx`: el payload de
  crear/editar incluye `providerCode`; la tarjeta muestra bajo la dirección
  `Prestador: <código>` o `— sin código —` en gris (`C.textMuted`) si es null.
- `medisxime-landing/src/components/admin/SedeTypes.ts` (si define el shape de
  la sede del listado): agregar `providerCode?: string | null`.

## 4. Errores / edge cases

- Backend responde `{ success: false, error: "Código de prestador requerido (8 a 12 dígitos)." }` con 400.
- El PUT sin `providerCode` en el body no borra el valor existente.
- `GET /api/locations` es público: el código de prestador es dato público del
  REPS, no sensible — sin restricción.

## 5. Verificación

- Migración corre limpia sobre DB con datos.
- Tests backend de la validación (400/201).
- `pnpm build` del frontend.
- e2e por API: crear sede con código → aparece en GET; crear sin código → 400;
  PUT de sede vieja con código válido → guarda; tarjetas muestran el código.
- Limpieza de datos de prueba creados.

## Fuera de alcance

- Validar el código contra el registro REPS real.
- Códigos de habilitación por servicio o por consultorio (rooms).
