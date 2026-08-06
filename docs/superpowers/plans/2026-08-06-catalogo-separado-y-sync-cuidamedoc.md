# Catálogo separado + Sincronización con CuidameDoc + Precios de control (Ximena) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Ximena's Medis admin the same capabilities Diana's got today: a service catalog separated from bookable offers, automatic sync of that catalog to CuidameDoc's public booking system, tiered "control" pricing, and a Cotizaciones panel visible in both Finanzas and Planes.

**Architecture:** Split `service_offers` into a new `service_catalog` table (Ximena's existing RIPS column names, plus `is_active`/`base_price`/`control_price`/`doc_prof_service_id` from day one) + `service_offers.catalog_id`, port Diana's `ensureDocSync` engine and `docAuth.ts` verbatim (parameterized for Ximena's professional_id and env vars), update the repository/controller to the catalog-split pattern, and extract the existing inline Cotizaciones block into a shared component mounted in two dashboards.

**Tech Stack:** Node/Express + PostgreSQL (`apps/backend`, raw `pg`, no ORM — same as `diana/medis`), React + Vite (`medisxime-landing`).

## Post-implementation status (2026-08-06)

All 7 tasks implemented and reviewed clean. The final whole-branch review
found 3 Critical + 5 Important + 4 Minor issues from the frontend↔backend
catalog contract never being fully reconciled across Tasks 2/3/5 (e.g.
`serviceName`/`basePrice`/`isActive` never sent by the form, `cups.repository.ts`
still querying columns migration 029 moved). One fix wave (commit `ae395be`)
addressed all 9 Critical/Important findings plus one cheap Minor.

A **second, independent scoped re-review** (run to completion, not just the
fixer's self-report) confirmed all 9 genuinely ADDRESSED — including
re-deriving that `serviceName`/`basePrice` normalization runs BEFORE
`catalogTouched` is computed in `updateOffer` (an easy way to reintroduce the
same bug), checking the inverse hazard (normalization can't null out
`service_name` when `title`/`price` are absent from a PATCH), and confirming
`createWithCatalog` uses one shared client for both inserts under a real
BEGIN/COMMIT/ROLLBACK, not two disguised non-transactional calls.

**Branch `feat/cups-catalog-recovered` has since been merged into `main`**
(commit `188da0b`), reconciled against 62 commits `main` had independently
gained (including its own CUPS catalog work) — one add/add conflict in
`cups.repository.ts` resolved in favor of this branch's JOIN to
`service_catalog` (main's side still queried the columns migration 029
already dropped from production). `ae395be`, and everything below, is now
on `main`.

**3 issues found in the fix wave itself.** The scoped re-review independently
re-derived and confirmed all three (including empirically bisecting N1 rather
than trusting the fixer's classification of it). Adjudicated below per
breaker rules — park what's non-blocking, stop on what's load-bearing —
rather than triggering a third fix wave:

1. **FIXED (commit `aab72ab`, merged `733289d`) — was: test coverage regression (Important, confirmed real via
   bisection, not a production defect):** `services.catalog.test.ts` went
   from 6/6 passing at `0d15dc0` to 5/6 at `ae395be` because the new
   `createWithCatalog` opens a real `pool.connect()` the test's existing
   mocks don't intercept — losing hermetic coverage of create-path payload
   normalization (capacity default, `scheduledAt` null, CUPS uppercase),
   exactly the area this wave touched. The re-review corrected the record:
   this is a genuine regression introduced by this diff, not pre-existing —
   but it's test-only (the production code it used to guard is independently
   confirmed correct above), so it doesn't block deploy. **Follow-up:** mock
   `ServiceOfferRepository.createWithCatalog` in that test's `beforeEach`,
   alongside the existing `ServiceCatalogRepository.create`/`fetch` mocks.

2. **FIXED (commit `aab72ab`, merged `733289d`).** ~~STOPPED — NOT parked. Must be fixed before this backend deploys to
   production (Important → treated as a deploy blocker on re-adjudication):~~
   the `isActive` fix (I1) makes `ServiciosDashboard.tsx`'s `handleToggleGroup`
   — the PATCH handler wired to the toggle button on every service card,
   used to pause/resume a service — PATCH all of a group's offer ids in
   parallel via `Promise.all`, each now triggering `ensureDocSync` where
   before the fix none of them did. Any group with more than one offer
   sharing a `catalog_id` (i.e. any recurring/multi-session service — the
   normal shape for a weekly class, not an edge case) races on reactivate: N
   concurrent reads of `doc_prof_service_id = null` → N concurrent CuidameDoc
   creates → only the last DB write wins, silently orphaning N-1 remote
   services in CuidameDoc's booking catalog with no stored id to ever delete
   them by. Deactivate is safe (repeat deletes are idempotent 404→ok).
   The original adjudication called this "zero blast radius today" because
   `service_offers` had 0 production rows at the time — true, but that
   framing conflated "not deployed yet" with "safe." It has zero blast radius
   *only* because the backend deploy (see below) hasn't happened; the first
   time a professional toggles a recurring service after deploy, this
   would have triggered it.

   **Resolution:** serialized `handleToggleGroup`'s PATCHes (sequential
   `for...of` instead of `Promise.all`) rather than adding a DB-level lock —
   since every offer in a group shares one `catalog_id` and
   `ServiceCatalogRepository.update` writes that shared row unconditionally,
   the first PATCH in the sequence converges the catalog to the target
   `isActive` state, so every subsequent PATCH in the same group sees
   `docSyncRelevantFieldsChanged() === false` and `ensureDocSync` doesn't
   fire again — the race is eliminated, not just narrowed, with a 2-file
   diff. A `SELECT ... FOR UPDATE` lock was considered and rejected: it
   would hold a Postgres row lock across two live HTTP calls to CuidameDoc
   (delete + create, each with its own timeout) for no benefit over the
   simpler fix, given the race has a single trigger point (one button).
   Verified: build clean, backend suite 50/56 (6 remaining fails are the
   same pre-existing DB-dependent integration tests noted throughout this
   doc — no live Postgres in the sandbox; no new failures).

3. **PARKED — redundant derivation, comment-only (Minor):**
   `mapGroupToFormValues` still derives the form's read-back `isActive` from
   `status !== 'draft'` rather than reading `catalog.isActive` directly.
   Currently self-healing (both are kept in sync on every write), but worth a
   code comment so a future edit doesn't "simplify" this redundancy away and
   silently reintroduce the deactivation bug (I1) this session just fixed.

**Also landed in the same session, outside this plan's original scope**
(dispatched in parallel once the above was merge-ready):
- Inventario admin dashboard for Ximena (`InventarioDashboard.tsx`) — the
  backend for this (`inventory_items`, migration 021) existed since an
  earlier session but had no UI until now.
- Calendar↔CuidameDoc appointments link (`/api/appointments/ximena` +
  `AdminClasses.tsx` merge) — ported from Diana's `/api/appointments/diana`
  pattern, preserving the `substring(0,5)+':00'` date-construction fix from
  the Invalid-Date bug fixed on Diana's side earlier the same day.

**Still pending, outside this plan's automation (manual operator actions):**
- Deploy `apps/backend` and `medisxime-landing` to production — **neither has
  been deployed as of this writing, only migration 029 is live.** N2 is no
  longer a blocker (fixed above), but deploy itself is now blocked on a
  different, unrelated problem: the only two existing deploy scripts
  (`scripts/deploy-rapido.ps1`, `scripts/deploy-medisxime.ps1`) are both
  unsafe to run as-is — one has a stale hardcoded file list that predates
  this session's new files, the other does `rm -rf` on the remote app
  directory and rewrites `.env` from a heredoc that omits the
  `XIMENA_INTERNAL_API_KEY`/`DOC_API_URL`/`DOC_XIMENA_EMAIL`/`DOC_XIMENA_PASSWORD`
  vars this whole feature depends on. A human needs to update one of these
  scripts (or write a new one) before any deploy is attempted.
- Task 8 (end-to-end production verification) — blocked on the deploy above.

## Global Constraints

- `service_offers` has 0 rows in production — no data migration, no backfill script needed anywhere in this plan.
- The new `service_catalog` table keeps Ximena's existing column names (`specialty`, `service_group`, `service_subgroup`, `service_category`, `service_subcategory`, `cups`, `modalities`, `image_url`, `instructions`, `restrictions`, `risks`, `contraindications`) — do NOT rename these to Diana's equivalents (`category_group`, `gender_restriction`, etc.).
- `modalities` stays a native Postgres `text[]` (Ximena's existing convention) — do NOT switch to Diana's `VARCHAR` + `JSON.stringify` storage.
- `control_price` and `doc_prof_service_id` are added in the SAME migration as `service_catalog` itself — there is no two-step history to replicate here.
- `control_price` must NEVER be added to the doc-sync-relevant-fields comparison (the equivalent of Diana's `DOC_SYNC_RELEVANT_FIELDS`) — a control-price-only change must never trigger a delete+recreate against CuidameDoc's booking catalog.
- Already done and verified live, **do not repeat or undo**: `professional_integrations` row for `professional_id=2` in `cuidame_doc_backend` (api_url `https://docxime.cuidame.tech/api`); `XIMENA_INTERNAL_API_KEY` in medisXime's production `.env` (verified via `POST /external-quotes` → 201); `DOC_API_URL`/`DOC_XIMENA_EMAIL`/`DOC_XIMENA_PASSWORD` in medisXime's production `.env` (verified via `POST /auth/login` against `doc-api.cuidame.tech` → 200, resolves to `professional_id=2`).
- Repo root for every task in this plan: `C:\Users\julia\Downloads\Opieka\medisXime` (backend: `apps/backend`; frontend: `medisxime-landing`). Current branch: `feat/cups-catalog-recovered` (already contains an unrelated, ready CUPS catalog feature — work directly on it, no new branch).
- Deploy order: backend (Tasks 1-4) must be deployed to medisXime's production before the frontend (Tasks 5-7) — the frontend's `handleFormSuccess` forwards the form payload verbatim to `POST/PATCH /api/services/offers`, so a frontend that sends `controlPrice` before the backend understands the new catalog-split payload shape would break EVERY service save, not just control-price ones (the backend's create/update handlers change their entire body-parsing logic in this plan, not just add one field).

---

### Task 1: `service_catalog` table + migration

**Files:**
- Create: `apps/backend/migrations/029_service_catalog_split.sql`

**Interfaces:**
- Produces: `service_catalog` table (id, service_name, description, specialty, service_group, service_subgroup, service_category, service_subcategory, cups, modalities text[], is_active, base_price, control_price, image_url, instructions, restrictions, risks, contraindications, doc_prof_service_id, created_at, updated_at); `service_offers.catalog_id UUID REFERENCES service_catalog(id) ON DELETE RESTRICT`.

- [ ] **Step 1: Write the migration**

```sql
-- ============================================================
-- Migration 029: Separar el catálogo de servicios de las ofertas agendables
-- ============================================================
-- service_offers tenía las columnas RIPS directo en la tabla (migración 020).
-- Esta migración las mueve a una tabla service_catalog nueva, separada de
-- las sesiones agendadas — mismo patrón que diana/medis, con los nombres de
-- columna que este repo ya usaba (no los de Diana). 0 filas en producción
-- al momento de escribir esto — sin backfill necesario.

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

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_service_catalog_updated_at') THEN
    CREATE TRIGGER trg_service_catalog_updated_at
      BEFORE UPDATE ON service_catalog
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END
$$;

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

- [ ] **Step 2: Confirm `set_updated_at()` already exists in this database**

Run: check for the function before assuming the trigger will work —
`psql -d medisXime_dev -c "SELECT proname FROM pg_proc WHERE proname = 'set_updated_at';"`
Expected: one row. `diana/medis` and `medisXime` both use this same trigger function name (confirmed by migration `020_service_catalog.sql`'s own `trg_offers_updated_at` in this repo already depending on it) — if the query returns zero rows, STOP and report back; do not invent a new function.

- [ ] **Step 3: Run the migration against the dev database**

Run: `psql -d medisXime_dev -f apps/backend/migrations/029_service_catalog_split.sql`
Expected: completes with no errors, safe to run twice (every statement is idempotent — `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `DROP COLUMN IF EXISTS`).

- [ ] **Step 4: Verify the schema**

Run: `psql -d medisXime_dev -c "\d service_catalog"` and `psql -d medisXime_dev -c "\d service_offers"`
Expected: `service_catalog` has all 20 columns listed above; `service_offers` has `catalog_id` and no longer has `specialty`/`service_group`/etc.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/migrations/029_service_catalog_split.sql
git commit -m "feat: separar catálogo de servicios (service_catalog) de service_offers"
```

---

### Task 2: Repositorio — `ServiceCatalogRepository` + `ServiceOfferRepository` sobre el catálogo separado

**Files:**
- Modify: `apps/backend/src/repositories/services.repository.ts:143-313` (the `rowToOffer`/`OFFER_SELECT`/`ServiceOfferRepository` block read in this session — re-read the file fresh before editing, other unrelated sections of this 551-line file must stay untouched)

**Interfaces:**
- Consumes: `service_catalog`/`service_offers.catalog_id` (Task 1).
- Produces: `export const ServiceCatalogRepository = { create(data): Promise<{id: string}>, update(id, data): Promise<void> }`; `ServiceOfferPublic.catalog: {...} | null` (new nested field, matching Diana's `ServiceOfferPublic.catalog` shape but with Ximena's field names); `ServiceOfferRepository.create`/`update` accept `catalogId` instead of the RIPS fields directly; `ServiceOfferRepository.deleteAndCountRemaining(id, catalogId): Promise<{deleted: boolean; remaining: number}>` replacing the old plain `delete`.

- [ ] **Step 1: Add `ServiceCatalogRepository`**

Insert this block right before the `// ─── SERVICE OFFERS ──────────────────────────────────────────` comment (currently line 141):

```ts
// ─── SERVICE CATALOG ──────────────────────────────────────────

export const ServiceCatalogRepository = {
  async create(data: any): Promise<{ id: string }> {
    const { rows } = await pool.query(
      `INSERT INTO service_catalog
         (service_name, description, specialty, service_group, service_subgroup, service_category,
          service_subcategory, cups, modalities, is_active, base_price, control_price, image_url,
          instructions, restrictions, risks, contraindications)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       RETURNING id`,
      [
        data.serviceName, data.description ?? null, data.specialty ?? null, data.serviceGroup ?? null,
        data.serviceSubgroup ?? null, data.serviceCategory ?? null, data.serviceSubcategory ?? null,
        data.cups ?? null, data.modalities ?? null, data.isActive ?? true, data.basePrice ?? 0,
        data.controlPrice ?? null, data.imageUrl ?? null, data.instructions ?? null,
        data.restrictions ?? null, data.risks ?? null, data.contraindications ?? null,
      ]
    );
    return rows[0];
  },

  async update(id: string, data: any): Promise<void> {
    const map: Record<string, string> = {
      serviceName: 'service_name', description: 'description', specialty: 'specialty',
      serviceGroup: 'service_group', serviceSubgroup: 'service_subgroup',
      serviceCategory: 'service_category', serviceSubcategory: 'service_subcategory',
      cups: 'cups', modalities: 'modalities', isActive: 'is_active',
      basePrice: 'base_price', controlPrice: 'control_price', imageUrl: 'image_url',
      instructions: 'instructions', restrictions: 'restrictions', risks: 'risks',
      contraindications: 'contraindications',
    };
    const sets: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    for (const [key, col] of Object.entries(map)) {
      if (data[key] !== undefined) {
        sets.push(`${col} = $${i++}`);
        values.push(data[key]);
      }
    }
    if (sets.length === 0) return;
    sets.push(`updated_at = NOW()`);
    values.push(id);
    await pool.query(`UPDATE service_catalog SET ${sets.join(', ')} WHERE id = $${i}`, values);
  },
};
```

Note `modalities` is a native `text[]` — pass the JS array straight through as a query
parameter (`pg` serializes JS arrays to Postgres arrays automatically); do NOT
`JSON.stringify` it (that's Diana's convention, not this repo's).

- [ ] **Step 2: Update `rowToOffer` to nest the catalog**

Replace the current `rowToOffer` function (lines 143-190) with:

```ts
function rowToOffer(row: Record<string, unknown>): ServiceOfferPublic {
  return {
    id:              row['id'] as string,
    catalogId:       (row['catalog_id'] as string) ?? null,
    title:           row['title'] as string,
    description:     (row['description'] as string) ?? null,
    offerType:       row['offer_type'] as ServiceOfferPublic['offerType'],
    status:          row['status'] as ServiceOfferPublic['status'],
    scheduledAt:     row['scheduled_at'] ? (row['scheduled_at'] as Date).toISOString() : null,
    durationMinutes: row['duration_minutes'] as number,
    capacity:        row['capacity'] as number,
    enrolledCount:   row['enrolled_count'] as number,
    price:           (row['price'] as number) ?? null,
    currency:        row['currency'] as string,
    consecutive:     (row['consecutive'] as number) ?? null,
    location: {
      id:   row['location_id'] as string,
      name: row['location_name'] as string,
    },
    room: row['room_id'] ? {
      id:       row['room_id'] as string,
      name:     row['room_name'] as string,
      capacity: row['room_capacity'] as number,
    } : null,
    professional: row['professional_id'] ? {
      id:        row['professional_id'] as string,
      firstName: row['professional_first'] as string,
      lastName:  row['professional_last'] as string,
      avatarUrl: (row['professional_avatar'] as string) ?? null,
    } : null,
    discipline: row['discipline_id'] ? {
      id:    row['discipline_id'] as string,
      name:  row['discipline_name'] as string,
      level: row['discipline_level'] as string,
    } : null,
    catalog: row['catalog_id'] ? {
      serviceName:        row['c_service_name'] as string,
      description:        (row['c_description'] as string) ?? null,
      specialty:          (row['c_specialty'] as string) ?? null,
      serviceGroup:       (row['c_service_group'] as string) ?? null,
      serviceSubgroup:    (row['c_service_subgroup'] as string) ?? null,
      serviceCategory:    (row['c_service_category'] as string) ?? null,
      serviceSubcategory: (row['c_service_subcategory'] as string) ?? null,
      cups:               (row['c_cups'] as string) ?? null,
      modalities:         (row['c_modalities'] as string[]) ?? null,
      isActive:           row['c_is_active'] as boolean,
      basePrice:          (row['c_base_price'] as number) ?? null,
      controlPrice:       (row['c_control_price'] as number) ?? null,
      imageUrl:           (row['c_image_url'] as string) ?? null,
      instructions:       (row['c_instructions'] as string) ?? null,
      restrictions:       (row['c_restrictions'] as string) ?? null,
      risks:              (row['c_risks'] as string) ?? null,
      contraindications:  (row['c_contraindications'] as string) ?? null,
    } : null,
  };
}
```

This drops the old top-level `specialty`/`serviceGroup`/etc. fields from
`ServiceOfferPublic` (they moved into `catalog`) — `specialty_id`/`discipline`
(the FK to the `specialties` table) is a SEPARATE, unrelated concept that
stays exactly as it was (not touched by this migration).

- [ ] **Step 3: Update `OFFER_SELECT`**

Replace the current `OFFER_SELECT` (lines 192-210) with:

```ts
const OFFER_SELECT = `
  SELECT
    so.id, so.catalog_id, so.title, so.description, so.offer_type, so.status,
    so.scheduled_at, so.duration_minutes, so.capacity, so.enrolled_count,
    so.price, so.currency, so.consecutive,
    l.id AS location_id, l.name AS location_name,
    r.id AS room_id, r.name AS room_name, r.capacity AS room_capacity,
    u.id AS professional_id, u.first_name AS professional_first,
    u.last_name AS professional_last, u.avatar_url AS professional_avatar,
    d.id AS discipline_id, d.name AS discipline_name, d.level AS discipline_level,
    c.service_name AS c_service_name, c.description AS c_description,
    c.specialty AS c_specialty, c.service_group AS c_service_group,
    c.service_subgroup AS c_service_subgroup, c.service_category AS c_service_category,
    c.service_subcategory AS c_service_subcategory, c.cups AS c_cups,
    c.modalities AS c_modalities, c.is_active AS c_is_active,
    c.base_price AS c_base_price, c.control_price AS c_control_price,
    c.image_url AS c_image_url, c.instructions AS c_instructions,
    c.restrictions AS c_restrictions, c.risks AS c_risks,
    c.contraindications AS c_contraindications
  FROM service_offers so
  JOIN locations l ON l.id = so.location_id
  LEFT JOIN rooms r ON r.id = so.room_id
  LEFT JOIN users u ON u.id = so.professional_id
  LEFT JOIN specialties d ON d.id = so.specialty_id
  LEFT JOIN service_catalog c ON c.id = so.catalog_id
`;
```

- [ ] **Step 4: Update `ServiceOfferRepository.create` and `.update`**

Replace `ServiceOfferRepository.create` (currently lines 250-273) with:

```ts
  async create(data: CreateServiceOfferPayload, createdBy: string): Promise<ServiceOfferPublic> {
    const { rows } = await pool.query(
      `INSERT INTO service_offers
         (catalog_id, location_id, room_id, offer_type, title, description,
          professional_id, specialty_id, capacity, duration_minutes,
          scheduled_at, price, currency, created_by, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING id`,
      [
        data.catalogId ?? null, data.locationId, data.roomId ?? null, data.offerType, data.title,
        data.description ?? null, data.professionalId ?? null,
        data.disciplineId ?? null, data.capacity ?? 1, data.durationMinutes,
        data.scheduledAt ?? null, data.price ?? null, data.currency ?? 'COP', createdBy,
        data.status ?? 'draft',
      ]
    );
    return (await this.findById(rows[0].id))!;
  },
```

(This keeps every non-RIPS field this repo's `create` already had — `disciplineId`→`specialty_id`, `status` — untouched; only the RIPS columns are removed from the INSERT and `catalogId` is added, matching what Task 3's controller will now pass in.)

In `ServiceOfferRepository.update` (currently lines 275-305), remove these
9 lines from the `map` (they no longer exist on `service_offers`):

```ts
      specialty: 'specialty', serviceGroup: 'service_group',
      serviceSubgroup: 'service_subgroup', serviceCategory: 'service_category',
      serviceSubcategory: 'service_subcategory', cups: 'cups',
      modalities: 'modalities', imageUrl: 'image_url',
      instructions: 'instructions', restrictions: 'restrictions',
      risks: 'risks', contraindications: 'contraindications',
```

and add `catalogId: 'catalog_id'` to what remains:

```ts
    const map: Record<string, string> = {
      title: 'title', description: 'description', roomId: 'room_id',
      professionalId: 'professional_id', disciplineId: 'specialty_id',
      capacity: 'capacity', durationMinutes: 'duration_minutes',
      scheduledAt: 'scheduled_at', price: 'price', currency: 'currency',
      status: 'status', catalogId: 'catalog_id',
    };
```

- [ ] **Step 5: Replace `ServiceOfferRepository.delete` with `deleteAndCountRemaining`**

The current `ServiceOfferRepository.delete` (lines 306-311, a plain
`DELETE FROM service_offers WHERE id = $1`) has no protection against a race
between two concurrent deletes of sibling offers that share a `catalog_id` —
each could see the other's row as "still there" via a plain count, so neither
ever counts as the last one, permanently stranding the CuidameDoc service
this catalog synced to. Run `grep -rn "OfferRepository.delete\b" apps/backend/src`
first to confirm nothing besides `deleteOffer` (which Task 3 rewrites to use
the new method) calls the old `delete` — if something else does, keep both
methods instead of replacing. Otherwise, replace it with:

```ts
  async deleteAndCountRemaining(
    id: string,
    catalogId: string | null
  ): Promise<{ deleted: boolean; remaining: number }> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      if (catalogId) {
        await client.query('SELECT id FROM service_catalog WHERE id = $1 FOR UPDATE', [catalogId]);
      }
      const { rowCount } = await client.query('DELETE FROM service_offers WHERE id = $1', [id]);
      let remaining = 0;
      if (catalogId) {
        const { rows } = await client.query(
          'SELECT COUNT(*)::int AS count FROM service_offers WHERE catalog_id = $1',
          [catalogId]
        );
        remaining = rows[0].count;
      }
      await client.query('COMMIT');
      return { deleted: (rowCount ?? 0) > 0, remaining };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },
```

- [ ] **Step 6: Typecheck**

Run: `cd apps/backend && npx tsc --noEmit`
Expected: errors only in `@medisxime/shared-types` for the `ServiceOfferPublic`/`CreateServiceOfferPayload`/`UpdateServiceOfferPayload` type definitions, which Step 7 fixes, and possibly in `services.controller.ts` wherever it calls the now-removed `delete` (Task 3 fixes that) — no other errors anywhere else in `services.repository.ts`.

- [ ] **Step 7: Update the shared types**

Find `ServiceOfferPublic`, `CreateServiceOfferPayload`, `UpdateServiceOfferPayload` in this repo's shared-types package (same package `@medisxime/shared-types` imported at the top of `services.repository.ts` — locate it via `find . -path '*/shared-types/src*' -iname '*service*'` from the repo root, it mirrors `diana/medis/packages/shared-types/src/models/services.types.ts`'s structure). Remove the flat `specialty`/`serviceGroup`/`serviceSubgroup`/`serviceCategory`/`serviceSubcategory`/`cups`/`modalities`/`imageUrl`/`instructions`/`restrictions`/`risks`/`contraindications` fields from `ServiceOfferPublic`, add `catalogId: string | null` and:

```ts
catalog: {
  serviceName: string;
  description: string | null;
  specialty: string | null;
  serviceGroup: string | null;
  serviceSubgroup: string | null;
  serviceCategory: string | null;
  serviceSubcategory: string | null;
  cups: string | null;
  modalities: string[] | null;
  isActive: boolean;
  basePrice: number | null;
  controlPrice: number | null;
  imageUrl: string | null;
  instructions: string | null;
  restrictions: string | null;
  risks: string | null;
  contraindications: string | null;
} | null;
```

Add `catalogId?: string;` to `CreateServiceOfferPayload` and `UpdateServiceOfferPayload`. Leave every other field on all three types untouched.

- [ ] **Step 8: Run the typecheck again**

Run: `cd apps/backend && npx tsc --noEmit`
Expected: clean (0 errors) in `services.repository.ts`; `services.controller.ts` still has errors (calls the now-removed `delete`, and doesn't yet import `ensureDocSync`/`ServiceCatalogRepository` the new way) — that's Task 3.

- [ ] **Step 9: Commit**

```bash
git add apps/backend/src/repositories/services.repository.ts packages/shared-types
git commit -m "feat: ServiceCatalogRepository + ServiceOfferRepository sobre catálogo separado"
```

---

### Task 3: `docAuth.ts` + `ensureDocSync` + controlador

**Files:**
- Create: `apps/backend/src/utils/docAuth.ts`
- Create: `apps/backend/src/services/docServiceSync.service.ts`
- Modify: `apps/backend/src/controllers/services.controller.ts`
- Test: `apps/backend/src/controllers/services.controller.docsync.test.ts`

**Interfaces:**
- Consumes: `ServiceCatalogRepository`/`ServiceOfferRepository` (Task 2); `env.DOC_API_URL`/`env.DOC_XIMENA_EMAIL`/`env.DOC_XIMENA_PASSWORD` (already set in production `.env`, need to be added to `apps/backend/src/config/env.ts` if that file validates/whitelists expected env vars — check that file first).
- Produces: `getDocToken()`, `refreshDocToken()` (from `docAuth.ts`); `ensureDocSync(params: EnsureDocSyncParams): Promise<{ok: boolean; error?: string}>` (from `docServiceSync.service.ts`); `createOffer`/`updateOffer`/`deleteOffer` on `services.controller.ts` rewritten to the catalog-split + doc-sync pattern.

- [ ] **Step 1: Add the 3 new vars to `apps/backend/src/config/env.ts`**

This file has a typed `env` object (confirmed this session). Add to the `Env` interface, right after `XIMENA_INTERNAL_API_KEY: string;`:

```ts
  DOC_API_URL: string;
  DOC_XIMENA_EMAIL: string;
  DOC_XIMENA_PASSWORD: string;
```

Add to the `export const env: Env = {...}` object literal, matching the exact `|| ''` fallback pattern every other string field in this object already uses:

```ts
  DOC_API_URL: process.env.DOC_API_URL || '',
  DOC_XIMENA_EMAIL: process.env.DOC_XIMENA_EMAIL || '',
  DOC_XIMENA_PASSWORD: process.env.DOC_XIMENA_PASSWORD || '',
```

Do not add these 3 to the `requiredEnvVars` array (currently `['DATABASE_URL', 'JWT_SECRET']`) — leave that array exactly as it is, matching how `XIMENA_INTERNAL_API_KEY` itself isn't in there either.

- [ ] **Step 2: Write `docAuth.ts`**

```ts
import { env } from '@config/env.js';

let accessToken: string | null = null;
let refreshToken: string | null = null;

async function loginXimena(): Promise<void> {
  const res = await fetch(`${env.DOC_API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: env.DOC_XIMENA_EMAIL, password: env.DOC_XIMENA_PASSWORD }),
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    throw new Error(`CuidameDoc login failed: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as { success: boolean; data: { access_token: string; refresh_token: string } };

  if (!json.success) {
    throw new Error('CuidameDoc login returned success=false');
  }

  accessToken = json.data.access_token;
  refreshToken = json.data.refresh_token;
}

async function tryRefresh(): Promise<void> {
  try {
    const res = await fetch(`${env.DOC_API_URL}/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      throw new Error(`Refresh failed: ${res.status}`);
    }

    const json = (await res.json()) as { success: boolean; data: { access_token: string; refresh_token: string } };

    if (!json.success) {
      throw new Error('Refresh returned success=false');
    }

    accessToken = json.data.access_token;
    refreshToken = json.data.refresh_token;
  } catch {
    await loginXimena();
  }
}

export async function getDocToken(): Promise<string> {
  if (!accessToken) {
    await loginXimena();
  }
  return accessToken!;
}

export async function refreshDocToken(): Promise<string> {
  await tryRefresh();
  return accessToken!;
}
```


- [ ] **Step 3: Write `docServiceSync.service.ts`**

```ts
// ============================================================
// apps/backend/src/services/docServiceSync.service.ts
// Sincroniza un servicio del catálogo local (service_catalog) con el
// catálogo real de CuidameDoc (professional_id=2, Ximena). CuidameDoc no
// tiene endpoint de edición: "actualizar" siempre es borrar + crear.
// Nunca lanza — toda llamada de red vuelve como { ok, error? } para que
// el llamador pueda decidir qué hacer sin que un fallo de CuidameDoc
// tumbe el guardado local.
// ============================================================

import { pool } from '@config/database.js';
import { env } from '@config/env.js';
import { getDocToken, refreshDocToken } from '@utils/docAuth.js';

export interface EnsureDocSyncParams {
  catalogId: string;
  active: boolean;
  serviceName: string;
  durationMinutes: number;
  serviceGroup: string;
  description?: string | null;
  price: number;
}

export interface EnsureDocSyncResult {
  ok: boolean;
  error?: string;
}

const CATEGORY_MAP: Record<string, string> = {
  '01 Consulta externa': 'consultation',
  '02 Apoyo diagnóstico y complementación terapéutica': 'diagnostic',
  '03 Internación': 'procedure',
  '04 Quirúrgico': 'procedure',
  '05 Atención inmediata': 'consultation',
};

export function mapServiceGroupToDocCategory(serviceGroup: string): string {
  return CATEGORY_MAP[serviceGroup] ?? 'consultation';
}

async function getCurrentDocProfServiceId(catalogId: string): Promise<number | null> {
  const { rows } = await pool.query(
    'SELECT doc_prof_service_id FROM service_catalog WHERE id = $1', [catalogId]
  );
  return rows[0]?.doc_prof_service_id ?? null;
}

async function setDocProfServiceId(catalogId: string, value: number | null): Promise<void> {
  await pool.query(
    'UPDATE service_catalog SET doc_prof_service_id = $1 WHERE id = $2', [value, catalogId]
  );
}

/** Llama `fetchFn` con el token actual; si CuidameDoc responde 401, refresca una vez y reintenta. */
async function withDocAuth(fetchFn: (token: string) => Promise<Response>): Promise<Response> {
  let token = await getDocToken();
  let res = await fetchFn(token);
  if (res.status === 401) {
    token = await refreshDocToken();
    res = await fetchFn(token);
  }
  return res;
}

async function createDocService(params: {
  serviceName: string; durationMinutes: number; serviceGroup: string;
  description?: string | null; price: number;
}): Promise<{ ok: true; profServiceId: number } | { ok: false; error: string }> {
  try {
    const body = JSON.stringify({
      service_name: params.serviceName,
      duration_minutes: params.durationMinutes,
      category: mapServiceGroupToDocCategory(params.serviceGroup),
      description: params.description ?? undefined,
      price: params.price,
    });
    const res = await withDocAuth((token) =>
      fetch(`${env.DOC_API_URL}/booking/my-services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body,
        signal: AbortSignal.timeout(8000),
      })
    );
    const json = await res.json() as { success: boolean; data?: { prof_service_id: number }; message?: string };
    if (!res.ok || !json.success || !json.data) {
      return { ok: false, error: json.message ?? `CuidameDoc respondió ${res.status}` };
    }
    return { ok: true, profServiceId: json.data.prof_service_id };
  } catch (err: unknown) {
    return { ok: false, error: (err as Error).message };
  }
}

async function deleteDocService(profServiceId: number): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await withDocAuth((token) =>
      fetch(`${env.DOC_API_URL}/booking/my-services/${profServiceId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(8000),
      })
    );
    if (res.status === 404) return { ok: true };
    const json = await res.json() as { success: boolean; message?: string };
    if (!res.ok || !json.success) {
      return { ok: false, error: json.message ?? `CuidameDoc respondió ${res.status}` };
    }
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function ensureDocSync(params: EnsureDocSyncParams): Promise<EnsureDocSyncResult> {
  try {
    const currentId = await getCurrentDocProfServiceId(params.catalogId);

    if (!params.active) {
      if (currentId === null) return { ok: true };
      const del = await deleteDocService(currentId);
      if (!del.ok) return { ok: false, error: del.error };
      await setDocProfServiceId(params.catalogId, null);
      return { ok: true };
    }

    if (currentId !== null) {
      const del = await deleteDocService(currentId);
      if (!del.ok) return { ok: false, error: del.error };
      await setDocProfServiceId(params.catalogId, null);
    }

    const created = await createDocService({
      serviceName: params.serviceName,
      durationMinutes: params.durationMinutes,
      serviceGroup: params.serviceGroup,
      description: params.description,
      price: params.price,
    });
    if (!created.ok) return { ok: false, error: created.error };

    await setDocProfServiceId(params.catalogId, created.profServiceId);
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: (err as Error).message };
  }
}
```

This is functionally identical to `diana/medis`'s `docServiceSync.service.ts`
except `categoryGroup`/`mapCategoryGroupToDocCategory` are renamed to
`serviceGroup`/`mapServiceGroupToDocCategory` to match this repo's own field
name (Global Constraint: keep Ximena's existing naming).

- [ ] **Step 4: Update `services.controller.ts`**

Re-read the current full file first (`apps/backend/src/controllers/services.controller.ts`, 514 lines) — only `createOffer`, `updateOffer`, `deleteOffer` and their surrounding helpers change; every other exported function (`getOperatingHours`, room handlers, `listOffers`, `getOffer`, booking-request handlers) stays untouched.

Add these imports at the top (alongside whatever this file already imports from `@repositories/services.repository.js`):

```ts
import { ensureDocSync } from '@services/docServiceSync.service.js';
```

Add near the top of the file, before the exported handlers:

```ts
/** Build parameters for ensureDocSync call from offer data */
function buildDocSyncParams(
  offer: { catalogId: string | null; durationMinutes: number; price: number | null; title: string; catalog?: { serviceName: string; serviceGroup: string | null; description: string | null; basePrice: number | null; isActive: boolean } | null },
  active: boolean,
) {
  return {
    catalogId: offer.catalogId!,
    active,
    serviceName: offer.catalog?.serviceName ?? offer.title,
    durationMinutes: offer.durationMinutes,
    serviceGroup: offer.catalog?.serviceGroup ?? '01 Consulta externa',
    description: offer.catalog?.description ?? null,
    price: Number(offer.catalog?.basePrice ?? offer.price ?? 0),
  };
}

const CATALOG_PAYLOAD_KEYS = [
  'serviceName', 'description', 'specialty', 'serviceGroup', 'serviceSubgroup',
  'serviceCategory', 'serviceSubcategory', 'cups', 'modalities', 'isActive',
  'basePrice', 'controlPrice', 'imageUrl', 'instructions', 'restrictions',
  'risks', 'contraindications',
];

/** Campos del catálogo que le importan a CuidameDoc — sólo un cambio en alguno de estos justifica un delete+create. */
const DOC_SYNC_RELEVANT_FIELDS = ['isActive', 'serviceName', 'serviceGroup', 'description', 'basePrice'] as const;

type DocSyncRelevantCatalog = {
  isActive: boolean;
  serviceName: string;
  serviceGroup: string | null;
  description: string | null;
  basePrice: number | null;
} | null | undefined;

function docSyncRelevantFieldsChanged(before: DocSyncRelevantCatalog, after: DocSyncRelevantCatalog): boolean {
  if (!before || !after) return true;
  return DOC_SYNC_RELEVANT_FIELDS.some((f) => before[f] !== after[f]);
}
```

Note `controlPrice` is in `CATALOG_PAYLOAD_KEYS` (so a control-price-only PATCH
still updates the catalog row) but NOT in `DOC_SYNC_RELEVANT_FIELDS` (so it
never triggers the delete+create cycle against CuidameDoc) — this is the
Global Constraint from the top of this plan, applied here exactly like Diana.

Find the current `createOffer` function and add the catalog-creation + sync
steps. If the current implementation directly does `ServiceOfferRepository.create(payload, adminId)` from the raw request body, change it to:

```ts
export async function createOffer(req: Request, res: Response): Promise<void> {
  try {
    let adminId = req.user?.id;
    if (!adminId) {
      const adminRes = await pool.query("SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1");
      adminId = adminRes.rows[0]?.id;
    }
    if (!adminId) {
      res.status(400).json({ success: false, error: 'No se encontró un administrador en la BD para asignar creador.' });
      return;
    }
    const payload = req.body as any;

    const catalogEntry = await ServiceCatalogRepository.create(payload);
    payload.catalogId = catalogEntry.id;

    const offer = await ServiceOfferRepository.create(payload, adminId);

    const docSync = await ensureDocSync(buildDocSyncParams(offer, offer.catalog?.isActive !== false));

    res.status(201).json({ success: true, data: { offer }, docSync });
  } catch (err: unknown) {
    const msg = (err as Error).message;
    res.status(500).json({ success: false, error: msg });
  }
}
```

Preserve whatever this repo's existing `createOffer` already does for the
admin-id fallback and error-status mapping (read it fresh before replacing —
don't blindly drop existing behavior this plan doesn't know about).

Replace `updateOffer` with:

```ts
export async function updateOffer(req: Request, res: Response): Promise<void> {
  try {
    const payload = req.body as any;
    const offerId = req.params['id']!;

    const existingOffer = await ServiceOfferRepository.findById(offerId);
    if (!existingOffer) { res.status(404).json({ success: false, error: 'Oferta no encontrada' }); return; }

    let catalogId = existingOffer.catalogId;
    const catalogTouched = CATALOG_PAYLOAD_KEYS.some((k) => payload[k] !== undefined);
    const catalogBefore = existingOffer.catalog;

    if (catalogId) {
      if (catalogTouched) await ServiceCatalogRepository.update(catalogId, payload);
    } else if (payload.serviceName) {
      const newCatalog = await ServiceCatalogRepository.create(payload);
      catalogId = newCatalog.id;
      await ServiceOfferRepository.update(offerId, { catalogId });
    }

    const offer = await ServiceOfferRepository.update(offerId, { ...payload, catalogId: catalogId ?? undefined });

    let docSync: { ok: boolean; error?: string } | undefined;
    if (offer?.catalogId && ((catalogTouched && docSyncRelevantFieldsChanged(catalogBefore, offer.catalog)) || offer.durationMinutes !== existingOffer.durationMinutes)) {
      docSync = await ensureDocSync(buildDocSyncParams(offer, offer.catalog?.isActive !== false));
    }

    res.json({ success: true, data: { offer }, ...(docSync ? { docSync } : {}) });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}
```

`ServiceOfferRepository.delete` in this repo is currently a plain
`DELETE FROM service_offers WHERE id = $1` (confirmed this session, no
concurrent-delete protection) — go back to Task 2's file and replace it with
`deleteAndCountRemaining`, matching `diana/medis`'s version (a `FOR UPDATE`
lock on the catalog row prevents two concurrent deletes of sibling offers
sharing a `catalog_id` from both seeing "not last" and stranding an orphaned
CuidameDoc service with nothing left to trigger its removal):

```ts
  async deleteAndCountRemaining(
    id: string,
    catalogId: string | null
  ): Promise<{ deleted: boolean; remaining: number }> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      if (catalogId) {
        await client.query('SELECT id FROM service_catalog WHERE id = $1 FOR UPDATE', [catalogId]);
      }
      const { rowCount } = await client.query('DELETE FROM service_offers WHERE id = $1', [id]);
      let remaining = 0;
      if (catalogId) {
        const { rows } = await client.query(
          'SELECT COUNT(*)::int AS count FROM service_offers WHERE catalog_id = $1',
          [catalogId]
        );
        remaining = rows[0].count;
      }
      await client.query('COMMIT');
      return { deleted: (rowCount ?? 0) > 0, remaining };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },
```

Replace this plain `delete` method entirely — nothing else in this repo calls
`ServiceOfferRepository.delete` (confirm with `grep -rn "OfferRepository.delete\b" apps/backend/src` before removing it, in case another caller exists that this plan doesn't know about).

Wire `deleteOffer` in the controller to call it + sync the removal when
`remaining === 0`, exactly like Diana's `deleteOffer`:

```ts
export async function deleteOffer(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params['id']!;
    const existing = await ServiceOfferRepository.findById(id);
    if (!existing) { res.status(404).json({ success: false, error: 'Oferta no encontrada' }); return; }

    const { deleted, remaining } = await ServiceOfferRepository.deleteAndCountRemaining(id, existing.catalogId);
    if (!deleted) { res.status(404).json({ success: false, error: 'Oferta no encontrada' }); return; }

    let docSync: { ok: boolean; error?: string } | undefined;
    if (existing.catalogId && remaining === 0) {
      docSync = await ensureDocSync(buildDocSyncParams(existing, false));
    }

    res.json({ success: true, data: null, ...(docSync ? { docSync } : {}) });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}
```

- [ ] **Step 5: Write the sync test**

Create `apps/backend/src/controllers/services.controller.docsync.test.ts` —
copy the exact structure of `diana/medis`'s
`apps/backend/src/controllers/services.controller.docsync.test.ts` (same
`node:test` + `pool` + mocked `fetch` pattern), adapted to this repo's
`createOffer`/`updateOffer` signatures and this plan's field names
(`serviceGroup` instead of `categoryGroup` in the create payload). At minimum
port these three cases: (1) `createOffer` syncs and sets `doc_prof_service_id`
when `isActive=true`; (2) a PATCH with only `{status}` does NOT trigger sync;
(3) a PATCH with only `{controlPrice}` does NOT trigger sync (new test, not
in Diana's file, but the exact same rationale — this is the Global Constraint
this plan calls out explicitly). Use `mockDocApiAlwaysSucceeds` mocking
`${env.DOC_API_URL}/auth/login`, `/booking/my-services` POST, and
`/booking/my-services/:id` DELETE, same as Diana's test file.

- [ ] **Step 6: Run the test**

Run: `cd apps/backend && node --import tsx --test src/controllers/services.controller.docsync.test.ts`
Expected: PASS, all 3 cases green. If the dev database isn't reachable in
this environment, this is a known, previously-encountered limitation in this
project (the dev DB is reached via SSH tunnel from local dev machines) — do
NOT skip the test file, just note in your report that it couldn't be
executed and why, exactly as flagged for the equivalent situation in
`diana/medis` earlier today.

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/utils/docAuth.ts apps/backend/src/services/docServiceSync.service.ts \
        apps/backend/src/controllers/services.controller.ts \
        apps/backend/src/controllers/services.controller.docsync.test.ts \
        apps/backend/src/config/env.ts
git commit -m "feat: ensureDocSync + docAuth para Ximena, controlador sobre catálogo separado"
```

---

### Task 4: Backfill script (opcional pero recomendado) + deploy de backend

**Files:**
- Create: `apps/backend/src/scripts/backfill-doc-sync.ts`

**Interfaces:**
- Consumes: `ensureDocSync` (Task 3).

- [ ] **Step 1: Write the backfill script**

Copy `diana/medis`'s `apps/backend/src/scripts/backfill-doc-sync.ts` verbatim,
adjusting only the SQL column names it queries (`category_group` →
`service_group`, and any other Diana-specific column name) to match this
repo's `service_catalog` schema from Task 1. Given `service_offers` has 0
rows in production, running this script after deploy will correctly do
nothing (0 services published) — it exists for future services created
directly via SQL/import tooling that bypass the admin form, matching why
Diana's copy exists.

- [ ] **Step 2: Deploy backend to production**

This is a manual step outside version control — flag it to the human
operator rather than attempting it from an implementer subagent: the
migration from Task 1 and the code from Tasks 2-3 must reach medisXime's
production server (same deploy mechanism as `diana/medis`'s
`deploy-Dianamedic.ps1`, but for `medisXime` — locate this repo's own deploy
script, likely `deploy-medisXime.ps1` or similar, sibling to the repo root)
BEFORE Task 5's frontend changes are deployed (Global Constraint at the top
of this plan).

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/scripts/backfill-doc-sync.ts
git commit -m "feat: backfill-doc-sync script para Ximena (mismo patrón que Diana)"
```

---

### Task 5: Frontend — campo "Precio de control" + payload de catálogo

**Files:**
- Modify: `medisxime-landing/src/components/admin/servicioSchema.ts:31-59`
- Modify: `medisxime-landing/src/components/admin/FormularioServicio.tsx:271-300` (submit handler), `:615-616` (price field)
- Modify: `medisxime-landing/src/components/admin/ServiciosDashboard.tsx:244-268` (`mapGroupToFormValues`)

**Interfaces:**
- Consumes: `controlPrice` accepted by `POST/PATCH /api/services/offers` (Task 3).
- Produces: `ServicioFormValues.controlPrice?: string`; `handleFormSubmit`'s `payload.controlPrice: number | undefined`.

- [ ] **Step 1: Add `controlPrice` to the zod schema**

In `servicioSchema.ts`, add right after the `price` field (line 46):

```ts
  price: z.string().refine(v => v !== '' && Number(v) >= 0, 'Precio requerido (0 o más)'),
  controlPrice: z.string().optional(),
```

No `.refine()` needed on `controlPrice` — unlike `price`, it's genuinely
optional (empty string is valid, meaning "no tiene niveles"), and unlike
Diana's `basePrice`/`controlPrice` (which use `valueAsNumber: true` on a
number input, producing `NaN` on empty), this field stays a plain string from
an ordinary text/number input the same way `price` already does in this
form — so it does NOT need Diana's `z.preprocess` NaN-guard fix.

- [ ] **Step 2: Add the input field**

In `FormularioServicio.tsx`, right after the "Precio por sesión (COP)"
`InputField` (lines 615-616), add:

```tsx
              <InputField label="Precio por sesión (COP)" icon={DollarSign} error={errors.price} required>
                <input type="number" min={0} {...register('price')} style={activeInputStyle(!!errors.price)} placeholder="0 para gratuito" />
              </InputField>
              <InputField label="Precio de control (2do en adelante)" icon={DollarSign} error={errors.controlPrice}>
                <input type="number" min={0} {...register('controlPrice')} style={activeInputStyle(!!errors.controlPrice)} placeholder="Déjalo vacío si no aplica" />
              </InputField>
              <p style={{ gridColumn: '1 / -1', margin: '-8px 0 8px', fontSize: 12, color: '#7A6452' }}>
                Si lo defines, el 1er control de este servicio siempre es gratis y desde el 2do se cobra este precio. Déjalo vacío para que el servicio no tenga niveles (comportamiento actual).
              </p>
```

Match the exact `style={{...}}` text color to whatever this file's own muted-text color constant is (`C.textBrown`/`C.textMedium` — check the `C` object at the top of this file, it's not necessarily `#7A6452` in every dashboard file in this repo despite `FinanzasDashboard.tsx` using that value).

- [ ] **Step 3: Add `controlPrice` to the submit payload**

In `handleFormSubmit` (lines 271-298), add `controlPrice` to the `payload` object, right after `price`:

```ts
        durationMinutes: Number(data.durationMinutes),
        price: Number(data.price),
        controlPrice: data.controlPrice ? Number(data.controlPrice) : undefined,
        status: data.isActive ? 'published' : 'draft',
```

- [ ] **Step 4: Add `controlPrice` to `mapGroupToFormValues`**

In `ServiciosDashboard.tsx`, add to the returned object (right after `price`):

```ts
      price: s.price != null ? String(s.price) : '',
      controlPrice: s.controlPrice != null ? String(s.controlPrice) : '',
```

Note `s` here is the offer object with its nested `catalog` — check whether
this repo's `ServiceGroup`/`representative` type flattens `catalog.*` fields
onto the top level already (mirrors how `s.specialty`/`s.serviceGroup` are
already read as top-level in the CURRENT `mapGroupToFormValues`, meaning
whatever transforms the raw API response into `g.representative` must already
flatten `catalog.*` — find and read that transform before assuming `s.price`
vs `s.catalog.basePrice` is the right accessor for `controlPrice`, and use
whichever one is consistent with how `s.price` itself is already read in this
exact function).

- [ ] **Step 5: Typecheck**

Run: `cd medisxime-landing && npx tsc -b` (or `npx tsc --noEmit` if this repo
isn't in project-references/solution-style build mode — check
`tsconfig.json` first) — confirm zero NEW errors in the 3 files this task
touched (this repo, like `diana/medis`, may have pre-existing unrelated `tsc`
errors elsewhere; grep the output for these 3 filenames specifically).

- [ ] **Step 6: Commit**

```bash
git add medisxime-landing/src/components/admin/servicioSchema.ts \
        medisxime-landing/src/components/admin/FormularioServicio.tsx \
        medisxime-landing/src/components/admin/ServiciosDashboard.tsx
git commit -m "feat: campo de precio de control en el formulario de servicio"
```

---

### Task 6: Frontend — extraer el panel de Cotizaciones CuidameDoc

**Files:**
- Create: `medisxime-landing/src/components/admin/shared/CotizacionesCuidameDocPanel.tsx`
- Modify: `medisxime-landing/src/components/admin/FinanzasDashboard.tsx`

**Interfaces:**
- Produces: `export function CotizacionesCuidameDocPanel({ onQuoteConfirmed, onPendingCountChange, showToast }: {...})` — identical contract to `diana/medis`'s version (Task 6 will mount it a second time).

- [ ] **Step 1: Create the shared component**

Copy `diana/medis`'s
`medisdiana-landing/src/components/admin/shared/CotizacionesCuidameDocPanel.tsx`
verbatim into `medisxime-landing/src/components/admin/shared/CotizacionesCuidameDocPanel.tsx`,
with these two textual changes only:
1. `'Cuando la Dra. Diana cierre...'` → `'Cuando la Dra. Ximena cierre...'`
2. If this repo's `FinanzasDashboard.tsx` uses a different heading font
   (confirmed above: `"Cormorant Garamond", serif`, not Diana's
   `"Bodoni Moda", serif`) or different accent colors than the ones hardcoded
   in this component (`#7C3AED` purple, `#16A34A` green, `#B91C1C`/`#DC2626`
   red — these are hardcoded in Diana's component, not theme-driven), keep
   them as-is for a first pass: the component is currently colored
   independently of the host dashboard's own palette in BOTH repos already
   (Diana's `FinanzasDashboard.tsx` uses browns/golds elsewhere but this
   panel is purple) — so no palette mismatch is introduced by copying it
   unchanged.

- [ ] **Step 2: Replace the inline block in `FinanzasDashboard.tsx`**

Remove from `FinanzasDashboard.tsx`:
- The `ExternalQuoteItem`/`ExternalQuote` interfaces (currently lines 20-40).
- The `externalQuotes`, `confirmingQuoteId`, `rejectingQuoteId` state (part of the state block around lines 90-103).
- `fetchExternalQuotes` (lines ~148-154) and its call inside the mount effect at line 339 — keep `fetchConfirmedQuotesTotal` and its call at line 340.
- `handleConfirmQuote`/`handleRejectQuote` (found via the earlier grep around the 240-270 range).
- The inline `{activeTab === 'cotizaciones' && <motion.div>...}` JSX block (lines 888-968).

Add:

```ts
import { CotizacionesCuidameDocPanel } from './shared/CotizacionesCuidameDocPanel';
```

```ts
  const [cotizacionesPendingCount, setCotizacionesPendingCount] = useState(0);
```

Replace the removed JSX block with:

```tsx
            {activeTab === 'cotizaciones' && (
              <CotizacionesCuidameDocPanel
                onQuoteConfirmed={(amount) => setConfirmedQuotesTotal(t => t + amount)}
                onPendingCountChange={setCotizacionesPendingCount}
                showToast={showPaymentToast}
              />
            )}
```

(Confirm the exact name of this file's toast function first — it may not be
called `showPaymentToast` here; use whatever this file's own toast helper is
named, matching the same pattern its OTHER handlers already use.)

Fix the tab selector's `count` for `cotizaciones` (line 597) — replace
`externalQuotes.length` with `cotizacionesPendingCount`.

`fetchConfirmedQuotesTotal`'s cast to `ExternalQuoteItem[]`/`ExternalQuote[]`
(if present, given those interfaces were removed) needs narrowing to
`{ totalAmount: number }[]`, same fix as Diana's.

This repo's KPI `useEffect` (lines 312-333) does NOT sum
`pendientesCotizaciones` at all — confirmed by reading it fresh in this
session — so unlike Diana's port, there is nothing to remove from that
`useEffect`; leave it untouched.

- [ ] **Step 3: Typecheck and build**

Run: `cd medisxime-landing && npx tsc -b (or --noEmit) && npm run build`
Expected: no NEW errors in `FinanzasDashboard.tsx` or the new shared
component file (this repo, like `diana/medis`, may have pre-existing
unrelated build errors elsewhere — grep the output for these two filenames).

- [ ] **Step 4: Commit**

```bash
git add medisxime-landing/src/components/admin/shared/CotizacionesCuidameDocPanel.tsx \
        medisxime-landing/src/components/admin/FinanzasDashboard.tsx
git commit -m "refactor: extraer el panel de Cotizaciones CuidameDoc a un componente compartido"
```

---

### Task 7: Frontend — montar Cotizaciones CuidameDoc en "Gestión de Planes"

**Files:**
- Modify: `medisxime-landing/src/components/admin/MembresiasDashboard.tsx`

**Interfaces:**
- Consumes: `CotizacionesCuidameDocPanel` (Task 6).

- [ ] **Step 1: Import the shared component**

```ts
import { CotizacionesCuidameDocPanel } from './shared/CotizacionesCuidameDocPanel';
```

- [ ] **Step 2: Mount it as its own section**

Right after the stat-tiles grid (the 4-tile grid ending around line
352-355 — confirmed fresh in this session: "Total planes"/"Planes
activos"/"Planes inactivos"/"Precio promedio") and before the
`{loading && (...)}` block, add:

```tsx
            <div style={{ marginBottom: '0.75rem' }}>
              <h2 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '1.1rem', color: C.text, margin: '0 0 4px' }}>Cotizaciones de pacientes</h2>
              <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>
                Cotizaciones de un solo uso creadas al cerrar una historia clínica en CuidameDoc — no forman parte del catálogo de planes reutilizables de abajo.
              </p>
            </div>
            <CotizacionesCuidameDocPanel showToast={showActionToast} />
```

Confirm `showActionToast` is this file's actual toast function name (it was
in `MembresiasDashboard.tsx`'s own state block, line 115, per this session's
fresh read) and confirm `C.text`/`C.textMuted` exist on this file's own `C`
palette object before using them (adapt if named differently). `onQuoteConfirmed`
is intentionally omitted, same as Diana's — this screen has no running
"confirmed total" KPI to update.

- [ ] **Step 3: Typecheck and build**

Run: `cd medisxime-landing && npx tsc -b (or --noEmit) && npm run build`
Expected: no NEW errors in `MembresiasDashboard.tsx`.

- [ ] **Step 4: Commit**

```bash
git add medisxime-landing/src/components/admin/MembresiasDashboard.tsx
git commit -m "feat: mostrar Cotizaciones CuidameDoc también en Gestión de Planes"
```

---

### Task 8: Verificación end-to-end en producción

**Files:** none — this is a manual verification task, not a code task.

**Interfaces:**
- Consumes: everything from Tasks 1-7, deployed to production (backend Task 4's Step 2, frontend after Task 7).

- [ ] **Step 1: Deploy the frontend to production**

Flag to the human operator, same as Task 4 Step 2 — locate and run this
repo's frontend deploy script, AFTER backend deploy is confirmed live.

- [ ] **Step 2: Create a real test service in Ximena's admin**

Via the deployed admin UI (`https://docxime.cuidame.tech` or wherever
`medisxime-landing`'s admin is actually served — confirm the real admin URL
first), create a service with a name like "Servicio de prueba — verificar
sync", a base price, and a control price, then publish it (`isActive: true`).

- [ ] **Step 3: Verify it reached CuidameDoc**

```bash
curl -s https://docxime.cuidame.tech/api/services/offers?status=published
```

Confirm the new service appears with a `catalogId`, then independently query
`GET /api/booking/professionals/2/services` on `doc-api.cuidame.tech` (with a
valid auth token, mirroring how this was verified for Diana earlier today)
to confirm CuidameDoc's own catalog now has this service with the right
price and `controlPrice`.

- [ ] **Step 4: Clean up the test service**

Delete or unpublish the test service created in Step 2, and confirm via the
same two checks that it disappears from both systems (delete+create cycle
completing the "remove" side correctly).

- [ ] **Step 5: Verify the Cotizaciones panel end-to-end**

Close a real (or test) historia clínica for one of Ximena's patients in
CuidameDoc with a treatment plan that has priced items, then confirm the
resulting cotización appears in BOTH `FinanzasDashboard.tsx` → "Cotizaciones
CuidameDoc" AND `MembresiasDashboard.tsx` → "Cotizaciones de pacientes",
and that confirming it in one clears it from the other after a refresh.

## Despliegue a producción (2026-08-06, tarde)

Desplegado a `docxime.cuidame.tech` (VM `cuidame-app`) vía copia recursiva de
`apps/backend/src`, `apps/backend/migrations`, `packages/shared-types/src` y
`medisxime-landing/src` (no vía `deploy-rapido.ps1`/`deploy-medisxime.ps1` —
ninguno de los dos era seguro, ver hallazgo de la investigación anterior).
Migración 029 ya estaba aplicada, confirmada por consulta directa antes de
tocar nada.

**Incidente preexistente encontrado y resuelto de paso** (no causado por este
trabajo): `medisXime-backend` llevaba desde ~14:15 UTC corriendo un proceso
huérfano con el código VIEJO (de antes de la migración 029), fallando con
`"column so.specialty does not exist"` en cada request a
`/api/services/offers` — exactamente el síntoma que el usuario reportó
("0 sesiones programadas"). PM2 mismo estaba en un loop de reinicio confuso
(marca "errored"/pid 0 pese a que el proceso real respondía) — mismo patrón
preexistente que tiene `medisdiana-backend` (no tocado, sigue funcionando).//
Resuelto matando el proceso huérfano y dejando que PM2 relanzara limpio con
el código nuevo ya copiado.

**`.env` de producción**: le faltaban `DOC_API_URL`, `DOC_XIMENA_EMAIL`,
`DOC_XIMENA_PASSWORD` y `XIMENA_INTERNAL_API_KEY` — el hallazgo anterior de
que "ya estaban verificados en producción" resultó ser sobre una verificación
puntual (curl de prueba), no sobre haberlos persistido en el `.env` real.
Agregados ahora; login contra `doc-api.cuidame.tech` reverificado en vivo
(200 OK) antes y después de escribirlos.

**Smoke test post-deploy**: `/api/services/offers` → 200 con el JOIN nuevo
(ya no falla), `/api/inventory` → 401 (ruta existe, protegida), 
`/api/appointments/ximena` → 401 (ruta existe, protegida), frontend servido
por nginx confirmado con el bundle recién compilado.

**Pendiente real, ahora sí solo Task 8**: probar el flujo completo con datos
reales (crear/editar un servicio y confirmar que sincroniza a CuidameDoc,
confirmar que una cita real de CuidameDoc aparece en el calendario de Medis)
— verificación funcional de extremo a extremo, no solo de que las rutas
respondan.
