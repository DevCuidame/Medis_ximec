# Spec — Módulo Descuentos + eliminación de beneficios/descuentos viejos

**Fecha**: 2026-07-15
**Estado**: Aprobado

## Objetivo

Nuevo apartado **Descuentos** en el panel admin (porcentaje y 2x1, con código
opcional, especialidad, vigencia y límites de uso), aplicado al calcular el
precio de las reservas. Se elimina la lógica vieja de descuentos/beneficios:
descuento % de planes, descuento % de inscripciones grupales, clases gratis /
créditos por categoría, y el catálogo de Beneficios. **Los únicos descuentos
del sistema pasan a ser los de este módulo.**

## Decisiones tomadas

1. **Alcance**: CRUD + aplicación en reservas en esta misma fase.
2. **Eliminación**: todo lo viejo (planes quedan como planes simples). Las
   tablas/columnas viejas NO se borran de la DB — el código deja de usarlas
   (limpieza de esquema en una fase posterior).
3. **Tipos**: `percentage` (con valor 1–100) y `two_for_one` (2x1). El código
   es atributo opcional de cualquier descuento, no un tipo.
4. **Ámbito**: por especialidad médica (`specialty`, null = todos los servicios).
5. El registro manual de pagos del admin (set-payment en Inscripciones) se
   conserva: es registro de pagos, no el motor viejo de descuentos.

## 1. DB — migración `apps/backend/migrations/019_discounts.sql`

```sql
CREATE TABLE IF NOT EXISTS discounts (
  id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 VARCHAR(120) NOT NULL,
  kind                 VARCHAR(12)  NOT NULL CHECK (kind IN ('percentage', 'two_for_one')),
  value                INTEGER      CHECK (value BETWEEN 1 AND 100),
  code                 VARCHAR(40)  UNIQUE,
  specialty            VARCHAR(100),
  starts_at            DATE,
  ends_at              DATE,
  max_uses_total       INTEGER      CHECK (max_uses_total > 0),
  max_uses_per_patient INTEGER      CHECK (max_uses_per_patient > 0),
  uses_count           INTEGER      NOT NULL DEFAULT 0,
  is_active            BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS discount_redemptions (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  discount_id        UUID        NOT NULL REFERENCES discounts(id) ON DELETE CASCADE,
  user_id            UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  booking_request_id UUID        REFERENCES booking_requests(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Reglas de datos: `value` es obligatorio si `kind='percentage'` (validado en la
capa de aplicación); `code` se guarda en MAYÚSCULAS y sin espacios; fechas y
límites en null = sin restricción. Trigger `set_updated_at` como las demás
tablas.

## 2. Backend — módulo Descuentos

### CRUD `/api/discounts` (todo `authenticate + authorize('ADMIN')`)

- `GET /api/discounts` → lista completa (activos e inactivos) con `usesCount`.
- `POST /api/discounts` → crea. Validaciones (400 con mensaje):
  - `name` requerido; `kind` ∈ {percentage, two_for_one};
  - `value` requerido 1–100 si percentage; ignorado/null si two_for_one;
  - `code` opcional (se normaliza a mayúsculas; 409 si ya existe);
  - `startsAt <= endsAt` cuando ambas vienen; límites > 0.
- `PATCH /api/discounts/:id` → edición parcial (mismas validaciones) e
  `isActive` para activar/desactivar.
- `DELETE /api/discounts/:id` → elimina (las redenciones caen por CASCADE;
  las reservas ya creadas conservan su monto).

Shape API (`DiscountPublic`): `{ id, name, kind, value, code, specialty,
startsAt, endsAt, maxUsesTotal, maxUsesPerPatient, usesCount, isActive,
createdAt }`.

### Resolución y aplicación en reservas

Función central `resolveDiscount({ userId, specialty, sessionCount, code? })`:

1. **Elegibilidad** de un descuento: `is_active`, hoy dentro de
   `[starts_at, ends_at]` (null = abierto), `uses_count < max_uses_total`
   (null = ilimitado), redenciones del paciente `< max_uses_per_patient`
   (null = ilimitado), `specialty` null o igual a la especialidad de la oferta,
   y para `two_for_one`: `sessionCount >= 2` (con 1 sesión no aplica).
2. **Con `code` en el body**: se busca ese código; si no existe o no es
   elegible → **400** con motivo ("Código inválido", "Código vencido",
   "Código agotado", "Ya usaste este código el máximo de veces",
   "El código no aplica a este servicio"). Un código válido gana siempre.
3. **Sin código**: entre los descuentos automáticos (code IS NULL) elegibles
   se elige el de **mayor ahorro** para esa reserva; empate → el creado más
   recientemente. Si no hay ninguno, precio completo.

Cálculo del monto (`price` = precio por sesión de la oferta, `n` = sesiones):

- Sin descuento: `expectedAmount = n * price`.
- `percentage`: `expectedAmount = n * round(price * (1 - value/100))`;
  `discount_pct = value`.
- `two_for_one`: `expectedAmount = ceil(n/2) * price`;
  `discount_pct = round(100 * (1 - ceil(n/2)/n))` (efectivo, para reportes).

Al crear la reserva con descuento aplicado: se inserta UNA fila en
`discount_redemptions` (por solicitud, no por sesión) y se incrementa
`uses_count`. Las redenciones **no se liberan** si el admin luego rechaza la
solicitud (regla simple aceptada; se revisa si genera fricción real).

El flujo con pricing (`createBulkBookingRequests` en `services.controller.ts`
— el único que calcula montos; `createBookingRequest` individual no calcula
precios y no se toca) acepta `discountCode?: string` en el body y usa
`resolveDiscount`, reemplazando por completo el bloque viejo
(membresías/créditos/inscripción).

## 3. Eliminación de lo viejo

### Backend
- Eliminar archivos: `routes/benefits.routes.ts`,
  `controllers/benefits.controller.ts`, `repositories/benefit.repository.ts`
  y su montaje en `routes/index.ts` (`/api/benefits` deja de existir).
- `services.controller.ts`: eliminar el bloque de pricing viejo en ambos
  flujos (activeMembership discount, inscriptionDiscountPct,
  coversFreeClasses, categoryCredits, hasClassCredits/classesRemaining,
  `getDisciplineCategory` si queda sin uso).
- `user-membership.repository.ts` / tipos: dejar de exponer
  `discountPercent`, créditos y beneficios en las respuestas; las membresías
  activas siguen existiendo (plan, fechas, estado de pago) pero ya no otorgan
  descuentos ni clases gratis. `findActiveInscriptionByUserId` se elimina si
  su único uso era el descuento.
- `membership.repository.ts` / `membership.types.ts`: los planes dejan de
  leer/escribir beneficios y `discount_percent` (columnas quedan huérfanas en
  DB, no se tocan).
- `email.util.ts`: quitar menciones de beneficios en correos si las hay.
- Verificación de borrado: `grep -ri "benefit" apps/backend/src` → 0 usos
  activos (comentarios históricos aceptables solo si el código asociado ya no
  existe).

### Frontend
- Eliminar `BeneficiosDashboard.tsx`, su import y la ruta `/admin/benefits`
  de `App.tsx`.
- `MembresiasDashboard.tsx`: quitar secciones/campos de beneficios y
  descuento de los formularios y tarjetas de planes.
- `UserMembresias.tsx` / `UserMemberships.tsx`: quitar la visualización de
  beneficios/descuentos de planes (los planes muestran nombre, precio,
  descripción).
- `UserServicios.tsx`: quitar lógica de créditos/clases gratis del cálculo
  mostrado; el precio refleja el descuento nuevo devuelto por el API.
- `FinanzasDashboard.tsx` / `InscripcionesDashboard.tsx`: conservan la
  visualización de `discount_pct`/montos registrados en reservas (histórico).

## 4. Frontend — apartado Descuentos

- **Sidebar** (`AdminSidebar.tsx`): nuevo ítem `descuentos` con ícono
  `BadgePercent` (lucide), entre Servicios y Finanzas; `AdminNavKey` gana
  `'descuentos'`. Navega a `/admin/discounts`.
- **Ruta** `/admin/discounts` (ADMIN) en `App.tsx` → `DescuentosDashboard`.
- **`DescuentosDashboard.tsx`** (nuevo, patrón de SedesDashboard: AdminSidebar
  + topbar + tarjetas + modales):
  - Header: kicker "Promociones", título "Descuentos", subtítulo
    "Porcentajes, 2x1 y códigos de descuento para tus pacientes.", botón
    "Nuevo Descuento".
  - Empty state: "Aún no has creado ningún descuento." / "Usa \"Nuevo
    Descuento\" para crear el primero."
  - Tarjeta por descuento: nombre, chip de tipo (Porcentaje X% / 2x1), código
    (o "Automático"), especialidad (o "Todos los servicios"), vigencia, usos
    (`usesCount / maxUsesTotal` o "∞"), estado activo/inactivo, acciones
    Editar / Activar-Desactivar / Eliminar (con confirmación).
  - Formulario modal "Nuevo Descuento" (mismo para editar): Nombre*, Tipo
    (select Porcentaje/2x1), Valor (%) (solo visible para Porcentaje),
    Código (opcional, hint "Déjalo vacío para que se aplique
    automáticamente"), Especialidad (select con "Todos los servicios" +
    las especialidades del sistema), Fecha inicio, Fecha fin, Límite usos
    totales, Límite por paciente. Validación con Zod + React Hook Form
    (patrón de sedeSchema/FormularioSede). Errores del servidor visibles en
    el modal sin cerrarlo.
- **Portal paciente** (`UserServicios.tsx`): campo opcional "Código de
  descuento" al confirmar la reserva; se envía como `discountCode`. Si el
  API responde 400 por código inválido, el mensaje se muestra y la reserva
  no se crea.

Especialidades para el select: las mismas que usan las ofertas de servicio
(la lista de especialidades activas del sistema vía el API existente de
specialties/disciplines; si no hay endpoint, la constante `DISCIPLINES`
compartida).

## 5. Errores / edge cases

- Código duplicado al crear/editar → 409 "Ese código ya existe."
- percentage sin `value` → 400. two_for_one con `value` → se guarda null.
- Reserva con código inválido → 400 con motivo específico (la reserva NO se
  crea).
- Descuento eliminado/desactivado después de usado: las reservas pasadas no
  cambian.
- Concurrencia de límites: el incremento de `uses_count` y el conteo de
  redenciones se hacen en la misma transacción de creación de la reserva.

## 6. Verificación

- Tests backend (node:test, repos monkeypatched): validaciones CRUD;
  `resolveDiscount` — elegibilidad por fechas/límites/especialidad/estado,
  código inválido → error con motivo, mejor-ahorro entre automáticos,
  percentage vs 2x1 (montos y pct efectivo), 2x1 con n=1 no aplica.
- e2e por API: CRUD completo; reservar sin código (aplica automático),
  con código válido, con código vencido/agotado (400); límite por paciente
  se agota; `GET /api/benefits` → 404; datos de prueba eliminados.
- Builds backend + frontend; grep de "benefit" sin usos activos.

## Fuera de alcance

- Borrar tablas/columnas viejas de la DB (fase posterior).
- Descuentos de monto fijo, apilables o por servicio individual.
- Liberar redenciones al rechazar solicitudes.
- Migrar descuentos viejos existentes a este módulo.
