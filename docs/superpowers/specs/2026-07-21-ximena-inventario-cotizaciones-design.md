# Diseño — Inventario con precio + Cotizaciones externas para Ximena (Dirección C)

## Contexto y objetivo

Tercer y último proyecto para conectar `medisXime` con CuidameDoc — ver
`CuidameDoc/INTEGRACION-APPS-EXTERNAS.md` para el mapa completo de las 3
direcciones. Direcciones A (agendamiento) y B (Sedes/Espacios/Profesionales)
ya están resueltas: A construida y desplegada; B resultó no necesitar código
nuevo (el backend de Ximena ya exponía `/locations`, `/rooms`,
`/professionals` — solo se corrigió un bug real en `/rooms` que ignoraba el
filtro `?locationId=`, commit `8cbe2cc`, pendiente de desplegar).

**Objetivo de este proyecto**: replicar en `medisXime` lo que ya existe en
`diana/medis` ("Proyecto A" del lado de Diana) — Inventario con precio y
Cotizaciones externas — para que cuando CuidameDoc cierre una historia
clínica con un plan de tratamiento cotizado contra Ximena, la cotización se
registre en su Finanzas.

## Estado verificado antes de diseñar

- El backend de Ximena está desplegado y en vivo en `https://docxime.cuidame.tech/api`.
- `GET /memberships/active` (para "Planes") ya existe, público, mismo shape
  que Diana (`{id, name, price, type, ...}`) — confirmado en vivo. **No
  requiere ningún cambio.**
- No existe todavía nada de Inventario ni Cotizaciones externas: ni
  migraciones, ni repositorios, ni controladores, ni rutas, ni el middleware
  de API key interna.
- `medisxime-landing/src/components/admin/FinanzasDashboard.tsx` existe con
  2 pestañas (`'planes' | 'servicios'`) — hay que agregar una tercera.
- Última migración comiteada en `main`: `020_service_catalog.sql` (existe
  una `021_membership_services.sql` sin comitear en el checkout principal,
  trabajo de otra sesión — este proyecto trabajará en un worktree aislado
  desde el último commit real, donde 021 está libre; si esa migración se
  comitea antes que este trabajo se fusione, habrá que renumerar en ese
  momento, no ahora).
- El trigger `set_updated_at()` ya existe (migración 001), reutilizable sin
  crearlo de nuevo.

## Alcance

**Incluye — Inventario con precio** (mirror exacto de `diana/medis`):
1. Migración `021_create_inventory_items.sql`: tabla `inventory_items`
   (`id UUID, name, category, unit, price INTEGER, quantity, min_stock,
   notes, is_active, created_at, updated_at`), índices en `is_active` y
   `category`, trigger de `updated_at`.
2. `apps/backend/src/types/inventory.types.ts`: `InventoryItemRecord`,
   `InventoryItemPublic`, `CreateInventoryItemDto`, `UpdateInventoryItemDto`,
   `InventorySearchFilters` — idénticos a Diana.
3. `apps/backend/src/repositories/inventory.repository.ts`:
   `InventoryRepository` con `listAll`, `listActive(filters)`, `findById`,
   `create`, `update`, `delete` (soft-delete → `is_active=false`) — idéntico
   a Diana.
4. `apps/backend/src/controllers/inventory.controller.ts`:
   `searchInventory` (público, proyecta solo `{id,name,category,unit,price}`
   — nunca expone `quantity`/`minStock`/`notes` a la llamada externa),
   `listInventory`, `createInventoryItem`, `updateInventoryItem`,
   `deleteInventoryItem` — idéntico a Diana, incluida la validación de
   `price` numérico ≥ 0.
5. `apps/backend/src/routes/inventory.routes.ts`: `GET /search` público;
   `GET /`, `POST /`, `PATCH /:id`, `DELETE /:id` admin
   (`authenticate, authorize('ADMIN')`).
6. Montar en `apps/backend/src/routes/index.ts`:
   `router.use('/inventory', inventoryRoutes);`.

**Incluye — Cotizaciones externas** (mirror exacto de `diana/medis`):
1. Migración `022_create_external_quotes.sql`: tabla `external_quotes`
   (`id UUID, source, external_reference, patient_name, patient_email,
   professional_name, items JSONB, total_amount INTEGER, status
   ('pending'|'confirmed'|'rejected'), resolved_by, resolved_at, created_at,
   updated_at`), índices en `status` y `source`, trigger de `updated_at`.
2. `apps/backend/src/types/external-quote.types.ts`: `ExternalQuoteStatus`,
   `ExternalQuoteItem`, `ExternalQuoteRecord`, `ExternalQuotePublic`,
   `CreateExternalQuoteDto` — idénticos a Diana.
3. `apps/backend/src/repositories/external-quote.repository.ts`:
   `ExternalQuoteRepository` con `listByStatus(status?)`, `findById`,
   `create`, `resolve(id, status, resolvedBy)` (solo transiciona desde
   `pending`, vía `WHERE status = 'pending'` en el `UPDATE`) — idéntico a
   Diana.
4. `apps/backend/src/controllers/external-quotes.controller.ts`:
   `createExternalQuote` (valida `patientName`, `items` con la forma
   `{type, refId, name, unitPrice, quantity, subtotal}`, `totalAmount`),
   `listExternalQuotes`, `confirmExternalQuote`, `rejectExternalQuote`
   (usa `req.user?.email ?? 'admin'` como `resolvedBy`) — idéntico a Diana.
5. `apps/backend/src/middleware/internal-api-key.middleware.ts` (archivo
   nuevo, no existe en medisXime todavía): `requireInternalApiKey` —
   compara el header `x-internal-api-key` contra
   `env.XIMENA_INTERNAL_API_KEY` con `crypto.timingSafeEqual`, mismo patrón
   que Diana.
6. `apps/backend/src/routes/external-quotes.routes.ts`: `POST /` protegido
   por `requireInternalApiKey` (server-to-server, no JWT); `GET /`,
   `PATCH /:id/confirm`, `PATCH /:id/reject` admin.
7. Montar en `routes/index.ts`: `router.use('/external-quotes', externalQuotesRoutes);`.
8. `apps/backend/src/config/env.ts`: agregar `XIMENA_INTERNAL_API_KEY:
   string` a la interfaz `Env` y al objeto exportado
   (`process.env.XIMENA_INTERNAL_API_KEY || ''`), **sin** añadirla a
   `requiredEnvVars` (igual que Diana: opcional, el middleware ya rechaza
   con 401 si está vacía).

**Incluye — pestaña "Cotizaciones CuidameDoc" en Finanzas** (mirror exacto
del bloque correspondiente en `diana/medis/medisdiana-landing`):
1. `FinanzasDashboard.tsx`: cambiar
   `useState<'planes' | 'servicios'>('planes')` →
   `useState<'planes' | 'servicios' | 'cotizaciones'>('planes')`.
2. Agregar tipos `ExternalQuoteItem`/`ExternalQuote` (idénticos a Diana) y
   estados `externalQuotes`, `confirmedQuotesTotal`, `confirmingQuoteId`,
   `rejectingQuoteId`.
3. Agregar `fetchExternalQuotes()` (`GET /api/external-quotes?status=pending`),
   `fetchConfirmedQuotesTotal()` (`GET /api/external-quotes?status=confirmed`,
   suma `totalAmount`), llamadas en el `useEffect` de carga inicial junto a
   las demás.
4. Agregar `handleConfirmQuote(id, patientName)` / `handleRejectQuote(id,
   patientName)` (`PATCH /api/external-quotes/:id/confirm` /
   `/reject`), mismo patrón optimista de actualización local que ya usan
   `handleConfirmServicePayment`/`handleRejectPayment` en este archivo.
5. Agregar la entrada `{ key: 'cotizaciones', label: 'Cotizaciones
   CuidameDoc', count: externalQuotes.length, color: '#7C3AED' }` al arreglo
   de pestañas (mismo color morado que usa Diana, no es un color de marca
   de Ximena — es un acento neutral para distinguir esta pestaña de
   "Planes"/"Servicios", igual que en el original).
6. Agregar el bloque de render de la pestaña (tarjetas por cotización con
   ítems, total, botones confirmar/rechazar) — mirror exacto del de Diana,
   con un solo cambio de texto: el estado vacío dice "Cuando la Dra. Ximena
   cierre una historia clínica..." en vez de "la Dra. Diana".

**No incluye:**
- Ningún cambio en CuidameDoc (ya es genérico).
- Registrar la fila de integración de Ximena en la tabla
  `professional_integrations` de CuidameDoc — eso se hace desde la pantalla
  admin `/home/admin/integrations` de CuidameDoc, después de que este
  proyecto y sus dos hermanos estén desplegados, generando ahí mismo el
  valor de `XIMENA_INTERNAL_API_KEY` que luego hay que pegar como variable
  de entorno en el servidor de Ximena.
- Desplegar nada — construcción y verificación local/worktree únicamente,
  igual que los proyectos anteriores de esta sesión.

## Testing

`diana/medis` tiene tests de repositorio (`inventory.repository.test.ts`,
`external-quote.repository.test.ts`) — este proyecto sigue el mismo patrón
en medisXime, adaptado a su test runner (`tsx --test`). Sin tests de
frontend para el bloque nuevo de `FinanzasDashboard.tsx` (consistente con
que ese archivo no tiene tests hoy en ninguno de los dos proyectos).

## Nota sobre el entorno de verificación

`npx tsc --noEmit` en `apps/backend` tiene ~437 errores preexistentes de
resolución de tipos de Express en absolutamente todo el árbol (síntoma de
`node_modules`/`@types` desactualizados en el checkout principal, no
relacionado con ningún código de este proyecto — confirmado durante el fix
de Dirección B). La verificación de este proyecto debe hacerse en un
worktree con `pnpm install` fresco desde cero, no confiando en el
`node_modules` del checkout principal.
