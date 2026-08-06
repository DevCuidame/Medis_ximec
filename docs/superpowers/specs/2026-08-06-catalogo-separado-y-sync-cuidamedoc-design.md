# Catálogo separado + Sincronización con CuidameDoc + Precios de control (Ximena)

**Fecha:** 2026-08-06
**Repos afectados:** `medisXime` (backend `apps/backend` + frontend `medisxime-landing`), `cuidame_doc_backend` (ya resuelto — ver abajo)

## Contexto

Hoy se construyó para Diana (`diana/medis`, repo hermano de este) un conjunto de
features: sincronización de su catálogo de servicios hacia CuidameDoc
(`ensureDocSync`), precios escalonados de control (`control_price`), y un
panel de "Cotizaciones CuidameDoc" visible tanto en Finanzas como en Planes y
Membresías. El pedido es llevar todo esto al mismo punto para Ximena (Dra. Ana
Ximena Correa Novoa), que tiene su propia web/paciente/backend independiente
en este repo (`medisXime`), estructuralmente el mismo código base que Diana
pero con datos y algo de esquema propios.

**Ya resuelto antes de esta spec** (no forma parte del plan de implementación,
documentado aquí por completitud):
- Ximena ya es profesional real en CuidameDoc (`professional_id = 2`), con su
  propio flujo de agendamiento delegado (`XimenaBookingCalendar.tsx`).
- Se creó la fila en `professional_integrations` (`cuidame_doc_backend`) para
  `professional_id = 2`, con `api_url = https://docxime.cuidame.tech/api` y un
  `internal_api_key` nuevo generado para la ocasión.
- Ese mismo `internal_api_key` se configuró como `XIMENA_INTERNAL_API_KEY` en
  el `.env` de producción de `medisXime` (`/var/www/medisXime/apps/backend/.env`
  en la VM `cuidame-app`) y se reinició el proceso — verificado con una
  petición real a `POST /external-quotes`: `201`.
- Se agregó `src/scripts/seed-ximena-integration.ts` en `cuidame_doc_backend`
  (mismo patrón que `seed-diana-integration.ts`) para poder recrear esa fila
  si hace falta.
- `XIMENA_API_URL`/`XIMENA_INTERNAL_API_KEY` quedaron también en el `.env` de
  producción de `cuidame_doc_backend`, como fuente para ese script de seed.

## Hallazgo clave: los esquemas de datos divergieron

El **frontend es prácticamente idéntico** al de Diana (mismos nombres de
componente: `AdminClasses.tsx`, `FinanzasDashboard.tsx`,
`MembresiasDashboard.tsx`, `ServiciosDashboard.tsx`, `FormularioServicio.tsx`,
`servicioSchema.ts`) — confirma lo que describió el usuario ("es la misma
página, solo con diferentes colores y especialidades").

El **backend de servicios NO pasó por el mismo refactor que tuvo Diana**:
Diana separó su catálogo (`service_catalog`) de las sesiones agendadas
(`service_offers`, vía `catalog_id`). Ximena nunca tuvo esa separación — todo
vive directo en `service_offers` (migración `020_service_catalog.sql` agregó
columnas RIPS planas ahí mismo: `specialty`, `service_group`,
`service_subgroup`, `service_category`, `service_subcategory`, `cups`,
`modalities` (nativo `text[]`, no VARCHAR+JSON como Diana), `image_url`,
`instructions`, `restrictions`, `risks`, `contraindications`).

**`service_offers` de Ximena tiene 0 filas en producción** — sin riesgo de
migrar datos reales. Esto permite hacer el refactor de separación de catálogo
sin backfill ni ventana de mantenimiento.

**Decisión explícita del usuario**: igualar la arquitectura de Ximena a la de
Diana (tabla `service_catalog` separada + sincronización), no una versión
simplificada sobre su tabla plana actual. Dentro de eso, **se conservan los
nombres de columna que Ximena ya usa** (`specialty`, `service_group`, etc.) en
vez de forzar los nombres RIPS exactos de Diana (`category_group`,
`gender_restriction`, etc.) — algunos campos de Ximena no tienen una
equivalencia semántica clara y garantizada con los de Diana (ej. "restrictions"
genérico vs. "gender_restriction" específico de Diana), así que renombrarlos a
ciegas sería adivinar.

## Diseño

### 1. Nueva tabla `service_catalog` (migración nueva, numeración continúa desde `028`)

```sql
CREATE TABLE IF NOT EXISTS service_catalog (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name        VARCHAR(255) NOT NULL,
  description         TEXT,
  specialty           VARCHAR(100),
  service_group       VARCHAR(60),
  service_subgroup    VARCHAR(60),
  service_category    VARCHAR(60),
  service_subcategory VARCHAR(60),
  cups                VARCHAR(10),
  modalities          TEXT[],
  is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
  base_price          NUMERIC(10,2),
  control_price       NUMERIC(10,2),
  image_url           VARCHAR(500),
  instructions        TEXT,
  restrictions        TEXT,
  risks               TEXT,
  contraindications   TEXT,
  doc_prof_service_id INTEGER,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_service_catalog_updated_at
  BEFORE UPDATE ON service_catalog
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE service_offers ADD COLUMN IF NOT EXISTS catalog_id UUID REFERENCES service_catalog(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_offers_catalog ON service_offers (catalog_id);

-- 0 filas en producción — seguro eliminar las columnas que se mudan al catálogo.
ALTER TABLE service_offers
  DROP COLUMN IF EXISTS specialty,
  DROP COLUMN IF EXISTS service_group,
  DROP COLUMN IF EXISTS service_subgroup,
  DROP COLUMN IF EXISTS service_category,
  DROP COLUMN IF EXISTS service_subcategory,
  DROP COLUMN IF EXISTS cups,
  DROP COLUMN IF EXISTS modalities,
  DROP COLUMN IF EXISTS image_url,
  DROP COLUMN IF EXISTS instructions,
  DROP COLUMN IF EXISTS restrictions,
  DROP COLUMN IF EXISTS risks,
  DROP COLUMN IF EXISTS contraindications;
```

`control_price` y `doc_prof_service_id` nacen junto con la tabla — a
diferencia de Diana (donde llegaron en migraciones separadas, semanas
distintas), acá no hace falta hacerlo en dos pasos porque se está construyendo
desde cero. `modalities` se mantiene como `text[]` nativo (el tipo que Ximena
ya usaba) en vez de adoptar el `VARCHAR` + `JSON.stringify` que usa Diana —
es una decisión de almacenamiento interna, invisible para el formulario, así
que no hay motivo para cambiarla.

### 2. Repositorio (`apps/backend/src/repositories/services.repository.ts`)

Se agrega un `ServiceCatalogRepository` (create/update) mirando el de Diana,
adaptado a estas columnas. `OFFER_SELECT` gana el `LEFT JOIN service_catalog c
ON c.id = so.catalog_id` y las columnas `c.*` con alias `c_*`. `rowToOffer`
anida un objeto `catalog: {...} | null` con todos los campos del catálogo
(incluido `controlPrice`, sin coerción `Number()` a este nivel — Postgres
devuelve `NUMERIC` como string vía `pg`, igual que en Diana; los llamadores
que necesiten un número real hacen `Number(...)` ellos mismos).
`ServiceOfferRepository.create`/`update` dejan de recibir directamente los
campos RIPS (ahora viven en el catálogo) y en su lugar reciben `catalogId`.

### 3. Controlador (`apps/backend/src/controllers/services.controller.ts`)

`createOffer` pasa a: (1) crear la fila de catálogo con los campos RIPS +
`base_price` (desde el `price` que ya manda el formulario) + `control_price` +
`is_active` (desde el `status` del formulario); (2) crear la oferta con
`catalogId`; (3) llamar `ensureDocSync` (ver punto 4). `updateOffer` hace el
mismo upsert de catálogo que Diana (crea catálogo si la oferta legada no
tenía, actualiza si ya existía) y solo re-sincroniza si cambió algo relevante
para CuidameDoc (mismo `docSyncRelevantFieldsChanged` que Diana, sin incluir
`control_price` en esa lista — igual que allá, un cambio de precio de control
no debe disparar el ciclo borrar+crear del catálogo de CuidameDoc).
`deleteOffer` sincroniza la baja solo si era la última oferta de ese catálogo.

### 4. `ensureDocSync` (nuevo archivo `apps/backend/src/services/docServiceSync.service.ts`)

Copia funcional del motor de Diana: login como Ximena contra CuidameDoc vía
un `docAuth.ts` nuevo en este repo (Ximena no tenía ningún puente hacia
CuidameDoc antes de hoy — confirmado, cero referencias a `cuidame.tech` en
todo `apps/backend/src`), mismo mecanismo de access/refresh token que el de
Diana. `active` decidido solo por `catalog.isActive`, delete+create para
"actualizar" (limitación aceptada, igual que Diana), categoría RIPS →
categoría CuidameDoc con el mismo mapeo (`01→consultation`,
`02→diagnostic`, `03/04→procedure`, `05→consultation`, default
`consultation`) usando el campo `service_group` de Ximena (equivalente a
`categoryGroup` de Diana).

Variables de entorno, ya configuradas en el `.env` de producción
(`/var/www/medisXime/apps/backend/.env`) antes de escribir esta spec:
`DOC_API_URL=https://doc-api.cuidame.tech/api`,
`DOC_XIMENA_EMAIL=ximenadoc@gmail.com`, `DOC_XIMENA_PASSWORD` (verificado con
un login real contra `POST /auth/login`: `200`, resuelve a `professional_id=2`).

### 5. Frontend (`medisxime-landing`)

- `servicioSchema.ts`: nuevo campo `controlPrice: z.string().optional()`
  (mismo patrón string-desde-input que ya usa `price` en este formulario,
  no el `z.preprocess` que tuvo que agregarse en Diana — acá el campo ya nace
  como string opcional desde cero, así que no hereda el bug de `NaN` que
  causó el Crítico de hoy en Diana).
- `FormularioServicio.tsx`: campo "Precio de control" junto al de precio,
  agrega `controlPrice: data.controlPrice ? Number(data.controlPrice) :
  undefined` al `payload` que arma `handleFormSubmit`.
- `ServiciosDashboard.tsx`: `handleFormSuccess` ya reenvía el `payload`
  completo sin reconstruirlo campo por campo (a diferencia del
  `ServiciosDashboard.tsx` de Diana) — **no hereda el bug de "controlPrice se
  pierde antes de llegar a la API"** que hubo que corregir hoy. Sí hace falta
  agregar `controlPrice` a `mapGroupToFormValues` (para precargarlo al
  editar), igual que en Diana.
- `FinanzasDashboard.tsx` ya tiene el bloque "Cotizaciones CuidameDoc" inline
  (mismo punto de partida que tenía Diana antes de hoy) — se extrae a
  `shared/CotizacionesCuidameDocPanel.tsx` (mismo componente que se diseñó
  para Diana, solo copiado/adaptado a este repo) y se monta en
  `FinanzasDashboard.tsx` (reemplazando el bloque inline) y en
  `MembresiasDashboard.tsx` ("Gestión de Planes"), como sección aparte del
  catálogo de planes reutilizables.

## Fuera de alcance

- El enlace "citas reales de CuidameDoc en el calendario de Programación"
  (`docAppointments.controller.ts`/`AdminClasses.tsx` en Diana) — se decidió
  hoy dejarlo en pausa para Diana por un bug sin resolver del todo; no tiene
  sentido duplicar una feature en pausa. Si más adelante se retoma para Diana,
  se evalúa entonces si también aplica para Ximena.
- No se migra ningún dato real (no hay ninguno que migrar).
- No se unifica el código entre los dos repos (`diana/medis` y `medisXime`
  siguen siendo bases de código independientes, solo con el mismo
  comportamiento).

## Testing

- Backend: tests de `ServiceCatalogRepository`/`ensureDocSync` mirando los
  equivalentes ya existentes en `diana/medis` (mock de `fetch`, verificación
  de que un cambio de solo `control_price` no dispara sync).
- Frontend: verificación manual (no hay harness de tests para estos
  dashboards admin en ninguno de los dos repos) + `tsc`/`vite build`.
- Verificación end-to-end: crear un servicio de prueba en el admin de
  Ximena, confirmar que aparece en el catálogo de CuidameDoc, y que una
  cotización de una HC de una paciente de Ximena llega a "Cotizaciones de
  pacientes" en ambas pantallas (Finanzas y Planes).
