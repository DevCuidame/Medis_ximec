# Ximena Inventario + Cotizaciones Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port `diana/medis`'s Inventory-with-price + External-quotes system into `medisXime`'s backend, plus the "Cotizaciones CuidameDoc" tab in `FinanzasDashboard.tsx`, so CuidameDoc can search Ximena's priced inventory and register quotes when a doctor closes a medical record with a treatment plan.

**Architecture:** Two new PostgreSQL tables (`inventory_items`, `external_quotes`), each with a repository/controller/routes trio following the exact pattern already used throughout `apps/backend` (see `location.repository.ts`/`location.controller.ts` for the established style). One new middleware (`requireInternalApiKey`) gates the server-to-server quote-creation endpoint. The frontend addition is a third tab in an already-3-tab-shaped dashboard component, reusing its existing `adminHeaders()`/`showPaymentToast()`/toast helpers.

**Tech Stack:** Node/Express/TypeScript (pnpm workspace), PostgreSQL (raw `pool.query`, no ORM), React + TypeScript + Framer Motion (frontend, plain npm package within the pnpm workspace).

## Global Constraints

- Follow the existing raw-SQL repository pattern exactly (`pool.query` from `@config/database.js`, no ORM) — this codebase does not use TypeORM or any query builder, unlike the sibling `CuidameDoc` projects worked on earlier this session.
- Reuse the existing `set_updated_at()` trigger function (from migration 001) — do not redefine it.
- `inventory_items.price`/`external_quotes.total_amount` are `INTEGER` (Colombian pesos, no decimals) — matches the rest of this codebase's money columns (e.g. `memberships.price`).
- The public `GET /inventory/search` endpoint must never return `quantity`, `min_stock`, or `notes` — only `{id, name, category, unit, price}`, matching the existing `diana/medis` contract CuidameDoc's proxy already expects.
- `POST /external-quotes` is server-to-server only (gated by `x-internal-api-key`, not JWT) — never put `authenticate`/`authorize` on that route.
- `apps/backend`'s `npx tsc --noEmit` currently has ~437 pre-existing errors across the entire tree (Express type-resolution issue from a stale `node_modules` in the main checkout, unrelated to this plan — confirmed while fixing an unrelated Dirección B bug earlier). Verify this plan's tasks in an isolated worktree with a fresh `pnpm install`, not against the main checkout's `node_modules`.
- No changes to CuidameDoc, no deploys, no registering Ximena's `professional_integrations` row — all out of scope for this plan (see spec's "No incluye").

---

### Task 1: Inventory with price

**Files:**
- Create: `apps/backend/migrations/021_create_inventory_items.sql`
- Create: `apps/backend/src/types/inventory.types.ts`
- Create: `apps/backend/src/repositories/inventory.repository.ts`
- Create: `apps/backend/src/controllers/inventory.controller.ts`
- Create: `apps/backend/src/routes/inventory.routes.ts`
- Modify: `apps/backend/src/routes/index.ts`

**Interfaces:**
- Produces: `GET /api/inventory/search?search=&category=` (public), `GET/POST /api/inventory`, `PATCH/DELETE /api/inventory/:id` (admin). Response envelope `{success: boolean, data: {items: InventoryItemPublic[]} | {item: InventoryItemPublic} | null, error?: string}`.

- [ ] **Step 1: Write the migration**

```sql
-- apps/backend/migrations/021_create_inventory_items.sql
-- ============================================================
-- Migration 021: Inventory items (Insumos, medicamentos, equipos)
-- ============================================================

CREATE TABLE IF NOT EXISTS inventory_items (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(150) NOT NULL,
  category     VARCHAR(50)  NOT NULL,
  unit         VARCHAR(30)  NOT NULL,
  price        INTEGER      NOT NULL DEFAULT 0,
  quantity     INTEGER      NOT NULL DEFAULT 0,
  min_stock    INTEGER      NOT NULL DEFAULT 0,
  notes        TEXT,
  is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_active ON inventory_items (is_active);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items (category);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_inventory_items_updated_at') THEN
    CREATE TRIGGER trg_inventory_items_updated_at
      BEFORE UPDATE ON inventory_items
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END
$$;
```

- [ ] **Step 2: Write the types**

```ts
// apps/backend/src/types/inventory.types.ts
export interface InventoryItemRecord {
  id: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  quantity: number;
  min_stock: number;
  notes: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface InventoryItemPublic {
  id: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  quantity: number;
  minStock: number;
  notes: string | null;
  isActive: boolean;
}

export interface CreateInventoryItemDto {
  name: string;
  category: string;
  unit: string;
  price: number;
  quantity?: number;
  minStock?: number;
  notes?: string | null;
  isActive?: boolean;
}

export type UpdateInventoryItemDto = Partial<CreateInventoryItemDto>;

export interface InventorySearchFilters {
  search?: string;
  category?: string;
}
```

- [ ] **Step 3: Write the repository**

```ts
// apps/backend/src/repositories/inventory.repository.ts
import { pool } from '@config/database.js';
import type {
  InventoryItemRecord,
  InventoryItemPublic,
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
  InventorySearchFilters,
} from '../types/inventory.types.js';

function toPublic(r: InventoryItemRecord): InventoryItemPublic {
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    unit: r.unit,
    price: r.price,
    quantity: r.quantity,
    minStock: r.min_stock,
    notes: r.notes,
    isActive: r.is_active,
  };
}

export const InventoryRepository = {
  async listAll(): Promise<InventoryItemPublic[]> {
    const { rows } = await pool.query<InventoryItemRecord>(
      `SELECT * FROM inventory_items ORDER BY name ASC`
    );
    return rows.map(toPublic);
  },

  async listActive(filters: InventorySearchFilters = {}): Promise<InventoryItemPublic[]> {
    const conditions: string[] = ['is_active = TRUE'];
    const values: unknown[] = [];
    let idx = 1;

    if (filters.search) {
      conditions.push(`name ILIKE $${idx++}`);
      values.push(`%${filters.search}%`);
    }
    if (filters.category) {
      conditions.push(`category = $${idx++}`);
      values.push(filters.category);
    }

    const { rows } = await pool.query<InventoryItemRecord>(
      `SELECT * FROM inventory_items WHERE ${conditions.join(' AND ')} ORDER BY name ASC`,
      values
    );
    return rows.map(toPublic);
  },

  async findById(id: string): Promise<InventoryItemPublic | null> {
    const { rows } = await pool.query<InventoryItemRecord>(
      `SELECT * FROM inventory_items WHERE id = $1 LIMIT 1`,
      [id]
    );
    return rows[0] ? toPublic(rows[0]) : null;
  },

  async create(dto: CreateInventoryItemDto): Promise<InventoryItemPublic> {
    const { rows } = await pool.query<InventoryItemRecord>(
      `INSERT INTO inventory_items (name, category, unit, price, quantity, min_stock, notes, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        dto.name,
        dto.category,
        dto.unit,
        dto.price,
        dto.quantity ?? 0,
        dto.minStock ?? 0,
        dto.notes ?? null,
        dto.isActive ?? true,
      ]
    );
    return toPublic(rows[0]);
  },

  async update(id: string, dto: UpdateInventoryItemDto): Promise<InventoryItemPublic | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (dto.name !== undefined)      { fields.push(`name = $${idx++}`);      values.push(dto.name); }
    if (dto.category !== undefined)  { fields.push(`category = $${idx++}`);  values.push(dto.category); }
    if (dto.unit !== undefined)      { fields.push(`unit = $${idx++}`);      values.push(dto.unit); }
    if (dto.price !== undefined)     { fields.push(`price = $${idx++}`);     values.push(dto.price); }
    if (dto.quantity !== undefined)  { fields.push(`quantity = $${idx++}`);  values.push(dto.quantity); }
    if (dto.minStock !== undefined)  { fields.push(`min_stock = $${idx++}`); values.push(dto.minStock); }
    if (dto.notes !== undefined)     { fields.push(`notes = $${idx++}`);     values.push(dto.notes); }
    if (dto.isActive !== undefined)  { fields.push(`is_active = $${idx++}`); values.push(dto.isActive); }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    const { rows } = await pool.query<InventoryItemRecord>(
      `UPDATE inventory_items SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return rows[0] ? toPublic(rows[0]) : null;
  },

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await pool.query(
      `UPDATE inventory_items SET is_active = FALSE WHERE id = $1 AND is_active = TRUE`,
      [id]
    );
    return (rowCount ?? 0) > 0;
  },
};
```

- [ ] **Step 4: Write the controller**

```ts
// apps/backend/src/controllers/inventory.controller.ts
import type { Request, Response } from 'express';
import { InventoryRepository } from '@repositories/inventory.repository.js';

export async function searchInventory(req: Request, res: Response): Promise<void> {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const items = await InventoryRepository.listActive({ search, category });
    // Endpoint público (sin auth) — no exponer stock/notas internas, solo lo necesario para cotizar.
    const publicItems = items.map(({ id, name, category, unit, price }) => ({ id, name, category, unit, price }));
    res.json({ success: true, data: { items: publicItems } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function listInventory(_req: Request, res: Response): Promise<void> {
  try {
    const items = await InventoryRepository.listAll();
    res.json({ success: true, data: { items } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function createInventoryItem(req: Request, res: Response): Promise<void> {
  try {
    const { name, category, unit, price } = req.body;
    if (!name || !category || !unit || price === undefined) {
      res.status(400).json({ success: false, error: 'Faltan campos requeridos: name, category, unit, price' });
      return;
    }
    if (typeof price !== 'number' || price < 0) {
      res.status(400).json({ success: false, error: 'price debe ser un número mayor o igual a 0' });
      return;
    }
    const item = await InventoryRepository.create(req.body);
    res.status(201).json({ success: true, data: { item } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function updateInventoryItem(req: Request, res: Response): Promise<void> {
  try {
    if (req.body.price !== undefined && (typeof req.body.price !== 'number' || req.body.price < 0)) {
      res.status(400).json({ success: false, error: 'price debe ser un número mayor o igual a 0' });
      return;
    }
    const item = await InventoryRepository.update(req.params.id, req.body);
    if (!item) { res.status(404).json({ success: false, error: 'Ítem no encontrado' }); return; }
    res.json({ success: true, data: { item } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function deleteInventoryItem(req: Request, res: Response): Promise<void> {
  try {
    const deleted = await InventoryRepository.delete(req.params.id);
    if (!deleted) { res.status(404).json({ success: false, error: 'Ítem no encontrado o ya inactivo' }); return; }
    res.json({ success: true, data: null });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}
```

- [ ] **Step 5: Write the routes**

```ts
// apps/backend/src/routes/inventory.routes.ts
import { Router } from 'express';
import { authenticate, authorize } from '@middleware/auth.middleware.js';
import {
  searchInventory,
  listInventory,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
} from '@controllers/inventory.controller.js';

const router: Router = Router();

// Público — búsqueda de catálogo activo (usado por CuidameDoc vía proxy)
router.get('/search', searchInventory);

// Admin — CRUD completo
router.get(   '/',     authenticate, authorize('ADMIN'), listInventory);
router.post(  '/',     authenticate, authorize('ADMIN'), createInventoryItem);
router.patch( '/:id',  authenticate, authorize('ADMIN'), updateInventoryItem);
router.delete('/:id',  authenticate, authorize('ADMIN'), deleteInventoryItem);

export default router;
```

- [ ] **Step 6: Mount the routes**

In `apps/backend/src/routes/index.ts`, add the import after `import discountsRoutes from './discounts.routes.js';`:
```ts
import inventoryRoutes from './inventory.routes.js';
```
and add the mount after `router.use('/discounts', discountsRoutes);`:
```ts
router.use('/inventory', inventoryRoutes);
```

- [ ] **Step 7: Verify**

Run: `cd apps/backend && pnpm exec tsc --noEmit 2>&1 | grep -E "inventory\.(types|repository|controller|routes)\.ts|routes/index\.ts"`
Expected: no output (the 4 new files and the one modified line in `index.ts` introduce zero type errors — the pre-existing ~437 unrelated errors elsewhere in the tree are expected and out of scope, see Global Constraints).

- [ ] **Step 8: Commit**

```bash
git add apps/backend/migrations/021_create_inventory_items.sql apps/backend/src/types/inventory.types.ts apps/backend/src/repositories/inventory.repository.ts apps/backend/src/controllers/inventory.controller.ts apps/backend/src/routes/inventory.routes.ts apps/backend/src/routes/index.ts
git commit -m "feat(inventory): add priced inventory catalog with public search"
```

---

### Task 2: External quotes

**Files:**
- Create: `apps/backend/migrations/022_create_external_quotes.sql`
- Create: `apps/backend/src/types/external-quote.types.ts`
- Create: `apps/backend/src/repositories/external-quote.repository.ts`
- Create: `apps/backend/src/middleware/internal-api-key.middleware.ts`
- Create: `apps/backend/src/controllers/external-quotes.controller.ts`
- Create: `apps/backend/src/routes/external-quotes.routes.ts`
- Modify: `apps/backend/src/routes/index.ts`
- Modify: `apps/backend/src/config/env.ts`

**Interfaces:**
- Consumes: nothing from Task 1 (independent tables).
- Produces: `POST /api/external-quotes` (server-to-server, `x-internal-api-key` header), `GET /api/external-quotes?status=`, `PATCH /api/external-quotes/:id/confirm`, `PATCH /api/external-quotes/:id/reject` (admin). Response envelope `{success, data: {quote} | {quotes: ExternalQuotePublic[]}, error?}`. `ExternalQuotePublic` shape is consumed by Task 3.

- [ ] **Step 1: Write the migration**

```sql
-- apps/backend/migrations/022_create_external_quotes.sql
-- ============================================================
-- Migration 022: External quotes (cotizaciones desde sistemas externos, ej. CuidameDoc)
-- ============================================================

CREATE TABLE IF NOT EXISTS external_quotes (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  source              VARCHAR(30)  NOT NULL DEFAULT 'cuidamedoc',
  external_reference  VARCHAR(100),
  patient_name        VARCHAR(150) NOT NULL,
  patient_email       VARCHAR(150),
  professional_name   VARCHAR(150),
  items               JSONB        NOT NULL,
  total_amount        INTEGER      NOT NULL,
  status              VARCHAR(20)  NOT NULL DEFAULT 'pending',
  resolved_by         VARCHAR(150),
  resolved_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_external_quotes_status CHECK (status IN ('pending', 'confirmed', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_external_quotes_status ON external_quotes (status);
CREATE INDEX IF NOT EXISTS idx_external_quotes_source ON external_quotes (source);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_external_quotes_updated_at') THEN
    CREATE TRIGGER trg_external_quotes_updated_at
      BEFORE UPDATE ON external_quotes
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END
$$;
```

- [ ] **Step 2: Write the types**

```ts
// apps/backend/src/types/external-quote.types.ts
export type ExternalQuoteStatus = 'pending' | 'confirmed' | 'rejected';

export interface ExternalQuoteItem {
  type: 'inventory' | 'plan';
  refId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface ExternalQuoteRecord {
  id: string;
  source: string;
  external_reference: string | null;
  patient_name: string;
  patient_email: string | null;
  professional_name: string | null;
  items: ExternalQuoteItem[];
  total_amount: number;
  status: ExternalQuoteStatus;
  resolved_by: string | null;
  resolved_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface ExternalQuotePublic {
  id: string;
  source: string;
  externalReference: string | null;
  patientName: string;
  patientEmail: string | null;
  professionalName: string | null;
  items: ExternalQuoteItem[];
  totalAmount: number;
  status: ExternalQuoteStatus;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface CreateExternalQuoteDto {
  source?: string;
  externalReference?: string;
  patientName: string;
  patientEmail?: string;
  professionalName?: string;
  items: ExternalQuoteItem[];
  totalAmount: number;
}
```

- [ ] **Step 3: Write the repository**

```ts
// apps/backend/src/repositories/external-quote.repository.ts
import { pool } from '@config/database.js';
import type {
  ExternalQuoteRecord,
  ExternalQuotePublic,
  CreateExternalQuoteDto,
  ExternalQuoteStatus,
} from '../types/external-quote.types.js';

function toPublic(r: ExternalQuoteRecord): ExternalQuotePublic {
  return {
    id: r.id,
    source: r.source,
    externalReference: r.external_reference,
    patientName: r.patient_name,
    patientEmail: r.patient_email,
    professionalName: r.professional_name,
    items: r.items,
    totalAmount: r.total_amount,
    status: r.status,
    resolvedBy: r.resolved_by,
    resolvedAt: r.resolved_at ? r.resolved_at.toISOString() : null,
    createdAt: r.created_at.toISOString(),
  };
}

export const ExternalQuoteRepository = {
  async listByStatus(status?: ExternalQuoteStatus): Promise<ExternalQuotePublic[]> {
    if (status) {
      const { rows } = await pool.query<ExternalQuoteRecord>(
        `SELECT * FROM external_quotes WHERE status = $1 ORDER BY created_at DESC`,
        [status]
      );
      return rows.map(toPublic);
    }
    const { rows } = await pool.query<ExternalQuoteRecord>(
      `SELECT * FROM external_quotes ORDER BY created_at DESC`
    );
    return rows.map(toPublic);
  },

  async findById(id: string): Promise<ExternalQuotePublic | null> {
    const { rows } = await pool.query<ExternalQuoteRecord>(
      `SELECT * FROM external_quotes WHERE id = $1 LIMIT 1`,
      [id]
    );
    return rows[0] ? toPublic(rows[0]) : null;
  },

  async create(dto: CreateExternalQuoteDto): Promise<ExternalQuotePublic> {
    const { rows } = await pool.query<ExternalQuoteRecord>(
      `INSERT INTO external_quotes
         (source, external_reference, patient_name, patient_email, professional_name, items, total_amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        dto.source ?? 'cuidamedoc',
        dto.externalReference ?? null,
        dto.patientName,
        dto.patientEmail ?? null,
        dto.professionalName ?? null,
        JSON.stringify(dto.items),
        dto.totalAmount,
      ]
    );
    return toPublic(rows[0]);
  },

  async resolve(id: string, status: 'confirmed' | 'rejected', resolvedBy: string): Promise<ExternalQuotePublic | null> {
    const { rows } = await pool.query<ExternalQuoteRecord>(
      `UPDATE external_quotes
       SET status = $1, resolved_by = $2, resolved_at = NOW()
       WHERE id = $3 AND status = 'pending'
       RETURNING *`,
      [status, resolvedBy, id]
    );
    return rows[0] ? toPublic(rows[0]) : null;
  },
};
```

- [ ] **Step 4: Write the internal-API-key middleware**

```ts
// apps/backend/src/middleware/internal-api-key.middleware.ts
import type { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { env } from '@config/env.js';

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function requireInternalApiKey(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers['x-internal-api-key'];
  const provided = typeof header === 'string' ? header : '';

  if (!env.XIMENA_INTERNAL_API_KEY || !safeEqual(provided, env.XIMENA_INTERNAL_API_KEY)) {
    res.status(401).json({ success: false, error: 'API key interna inválida o ausente.' });
    return;
  }

  next();
}
```

- [ ] **Step 5: Write the controller**

```ts
// apps/backend/src/controllers/external-quotes.controller.ts
import type { Request, Response } from 'express';
import { ExternalQuoteRepository } from '@repositories/external-quote.repository.js';
import type { ExternalQuoteItem, ExternalQuoteStatus } from '../types/external-quote.types.js';

function isValidItems(items: unknown): items is ExternalQuoteItem[] {
  return Array.isArray(items) && items.every((it) =>
    it && typeof it === 'object' &&
    (it.type === 'inventory' || it.type === 'plan') &&
    typeof it.refId === 'string' &&
    typeof it.name === 'string' &&
    typeof it.unitPrice === 'number' &&
    typeof it.quantity === 'number' &&
    typeof it.subtotal === 'number'
  );
}

export async function createExternalQuote(req: Request, res: Response): Promise<void> {
  try {
    const { patientName, items, totalAmount } = req.body;
    if (!patientName || typeof patientName !== 'string') {
      res.status(400).json({ success: false, error: 'patientName es requerido' });
      return;
    }
    if (!isValidItems(items) || items.length === 0) {
      res.status(400).json({ success: false, error: 'items debe ser un arreglo no vacío con la forma { type, refId, name, unitPrice, quantity, subtotal }' });
      return;
    }
    if (typeof totalAmount !== 'number' || totalAmount < 0) {
      res.status(400).json({ success: false, error: 'totalAmount debe ser un número mayor o igual a 0' });
      return;
    }

    const quote = await ExternalQuoteRepository.create(req.body);
    res.status(201).json({ success: true, data: { quote } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function listExternalQuotes(req: Request, res: Response): Promise<void> {
  try {
    const status = typeof req.query.status === 'string' ? (req.query.status as ExternalQuoteStatus) : undefined;
    const quotes = await ExternalQuoteRepository.listByStatus(status);
    res.json({ success: true, data: { quotes } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

async function resolveQuote(req: Request, res: Response, status: 'confirmed' | 'rejected'): Promise<void> {
  try {
    const resolvedBy = req.user?.email ?? 'admin';
    const quote = await ExternalQuoteRepository.resolve(req.params.id, status, resolvedBy);
    if (!quote) {
      res.status(409).json({ success: false, error: 'La cotización no existe o ya fue resuelta' });
      return;
    }
    res.json({ success: true, data: { quote } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function confirmExternalQuote(req: Request, res: Response): Promise<void> {
  await resolveQuote(req, res, 'confirmed');
}

export async function rejectExternalQuote(req: Request, res: Response): Promise<void> {
  await resolveQuote(req, res, 'rejected');
}
```

`req.user` is already a globally-augmented property on Express's `Request` type in this codebase (`declare global { namespace Express { ... } }` in `apps/backend/src/middleware/auth.middleware.ts`, already consumed the same way in `services.controller.ts` and others) — this will type-check with no extra setup.

- [ ] **Step 6: Write the routes**

```ts
// apps/backend/src/routes/external-quotes.routes.ts
import { Router } from 'express';
import { authenticate, authorize } from '@middleware/auth.middleware.js';
import { requireInternalApiKey } from '@middleware/internal-api-key.middleware.js';
import {
  createExternalQuote,
  listExternalQuotes,
  confirmExternalQuote,
  rejectExternalQuote,
} from '@controllers/external-quotes.controller.js';

const router: Router = Router();

// Server-to-server — protegido por API key compartida, no por JWT de usuario
router.post('/', requireInternalApiKey, createExternalQuote);

// Admin
router.get(   '/',            authenticate, authorize('ADMIN'), listExternalQuotes);
router.patch( '/:id/confirm', authenticate, authorize('ADMIN'), confirmExternalQuote);
router.patch( '/:id/reject',  authenticate, authorize('ADMIN'), rejectExternalQuote);

export default router;
```

- [ ] **Step 7: Mount the routes**

In `apps/backend/src/routes/index.ts`, add the import after `import inventoryRoutes from './inventory.routes.js';` (from Task 1):
```ts
import externalQuotesRoutes from './external-quotes.routes.js';
```
and add the mount after `router.use('/inventory', inventoryRoutes);`:
```ts
router.use('/external-quotes', externalQuotesRoutes);
```

- [ ] **Step 8: Add the env var**

In `apps/backend/src/config/env.ts`, add to the `Env` interface, right after `ADMIN_EMAIL: string;`:
```ts
  XIMENA_INTERNAL_API_KEY: string;
```
and add to the exported `env` object, right after `ADMIN_EMAIL: process.env.ADMIN_EMAIL || process.env.EMAIL_USER || '',`:
```ts
  XIMENA_INTERNAL_API_KEY: process.env.XIMENA_INTERNAL_API_KEY || '',
```
Do **not** add `XIMENA_INTERNAL_API_KEY` to the `requiredEnvVars` array — it stays optional, matching `DIANA_INTERNAL_API_KEY` in `diana/medis` (the middleware itself rejects requests with a 401 if it's empty, no need to crash startup over it).

- [ ] **Step 9: Verify**

Run: `cd apps/backend && pnpm exec tsc --noEmit 2>&1 | grep -E "external-quote|internal-api-key\.middleware\.ts|routes/index\.ts|config/env\.ts"`
Expected: no output (same reasoning as Task 1's Step 7 — pre-existing unrelated errors elsewhere are expected).

- [ ] **Step 10: Commit**

```bash
git add apps/backend/migrations/022_create_external_quotes.sql apps/backend/src/types/external-quote.types.ts apps/backend/src/repositories/external-quote.repository.ts apps/backend/src/middleware/internal-api-key.middleware.ts apps/backend/src/controllers/external-quotes.controller.ts apps/backend/src/routes/external-quotes.routes.ts apps/backend/src/routes/index.ts apps/backend/src/config/env.ts
git commit -m "feat(external-quotes): add server-to-server quote registration for CuidameDoc"
```

---

### Task 3: "Cotizaciones CuidameDoc" tab in FinanzasDashboard

**Files:**
- Modify: `medisxime-landing/src/components/admin/FinanzasDashboard.tsx`

**Interfaces:**
- Consumes: `GET /api/external-quotes?status=pending`, `GET /api/external-quotes?status=confirmed`, `PATCH /api/external-quotes/:id/confirm`, `PATCH /api/external-quotes/:id/reject` (Task 2, same-origin relative `/api/...` fetch like every other call in this file).

- [ ] **Step 1: Add the `ExternalQuoteItem`/`ExternalQuote` interfaces**

Insert after the `PendingServicePayment` interface's closing brace (currently line 70) and before `export const FinanzasDashboard`:
```ts
interface ExternalQuoteItem {
  type: 'inventory' | 'plan';
  refId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

interface ExternalQuote {
  id: string;
  externalReference: string | null;
  patientName: string;
  patientEmail: string | null;
  professionalName: string | null;
  items: ExternalQuoteItem[];
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'rejected';
  createdAt: string;
}
```

- [ ] **Step 2: Widen `activeTab`'s type and add state**

Replace:
```ts
  const [activeTab, setActiveTab] = useState<'planes' | 'servicios'>('planes');
```
with:
```ts
  const [activeTab, setActiveTab] = useState<'planes' | 'servicios' | 'cotizaciones'>('planes');
```

Add new state right after `const [deletingServiceId, setDeletingServiceId] = useState<string | null>(null);`:
```ts
  const [externalQuotes, setExternalQuotes] = useState<ExternalQuote[]>([]);
  const [confirmedQuotesTotal, setConfirmedQuotesTotal] = useState(0);
  const [confirmingQuoteId, setConfirmingQuoteId] = useState<string | null>(null);
  const [rejectingQuoteId, setRejectingQuoteId] = useState<string | null>(null);
```

- [ ] **Step 3: Add the fetch functions**

Add right after the `fetchPendingServices` function (before `handleRejectPayment`):
```ts
  const fetchExternalQuotes = async () => {
    try {
      const res = await fetch('/api/external-quotes?status=pending', { headers: adminHeaders() });
      const data = await res.json();
      if (data.success) setExternalQuotes(data.data.quotes);
    } catch { /* ignore */ }
  };

  const fetchConfirmedQuotesTotal = async () => {
    try {
      const res = await fetch('/api/external-quotes?status=confirmed', { headers: adminHeaders() });
      const data = await res.json();
      if (data.success) {
        const total = (data.data.quotes as ExternalQuote[]).reduce((sum, q) => sum + (q.totalAmount || 0), 0);
        setConfirmedQuotesTotal(total);
      }
    } catch { /* ignore */ }
  };
```

- [ ] **Step 4: Add the confirm/reject handlers**

Add right after the `handleDeleteServicePayment` function (before `handleConfirmServicePayment`):
```ts
  const handleConfirmQuote = async (id: string, patientName: string) => {
    setConfirmingQuoteId(id);
    try {
      const res = await fetch(`/api/external-quotes/${id}/confirm`, { method: 'PATCH', headers: adminHeaders() });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Error al confirmar');
      setConfirmedQuotesTotal(t => t + (externalQuotes.find(q => q.id === id)?.totalAmount ?? 0));
      setExternalQuotes(prev => prev.filter(q => q.id !== id));
      showPaymentToast(`Cotización de ${patientName} confirmada como ingreso.`, true);
    } catch (e: unknown) {
      showPaymentToast((e as Error).message, false);
    } finally {
      setConfirmingQuoteId(null);
    }
  };

  const handleRejectQuote = async (id: string, patientName: string) => {
    setRejectingQuoteId(id);
    try {
      const res = await fetch(`/api/external-quotes/${id}/reject`, { method: 'PATCH', headers: adminHeaders() });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Error al rechazar');
      setExternalQuotes(prev => prev.filter(q => q.id !== id));
      showPaymentToast(`Cotización de ${patientName} rechazada.`, false);
    } catch (e: unknown) {
      showPaymentToast((e as Error).message, false);
    } finally {
      setRejectingQuoteId(null);
    }
  };
```

- [ ] **Step 5: Fetch on mount**

Replace:
```ts
  useEffect(() => {
    fetchActive();
    fetchPending();
    fetchPendingServices();
  }, []);
```
with:
```ts
  useEffect(() => {
    fetchActive();
    fetchPending();
    fetchPendingServices();
    fetchExternalQuotes();
    fetchConfirmedQuotesTotal();
  }, []);
```

- [ ] **Step 6: Add the tab entry**

Replace:
```ts
                { key: 'planes',    label: 'Gestión de Planes',       count: activeMemberships.length + pendingPayments.length,  color: C.gold },
                { key: 'servicios', label: 'Servicios Adicionales',   count: pendingServices.length,  color: '#B45309' },
```
with:
```ts
                { key: 'planes',    label: 'Gestión de Planes',       count: activeMemberships.length + pendingPayments.length,  color: C.gold },
                { key: 'servicios', label: 'Servicios Adicionales',   count: pendingServices.length,  color: '#B45309' },
                { key: 'cotizaciones', label: 'Cotizaciones CuidameDoc', count: externalQuotes.length, color: '#7C3AED' },
```

- [ ] **Step 7: Add the tab-content render block**

Insert right after the `servicios` tab's closing `</motion.div>}` (currently line 807) and before the closing `</div>` of the tab-content wrapper (currently line 809):
```tsx

            {/* ── COTIZACIONES CUIDAMEDOC ── */}
            {activeTab === 'cotizaciones' && <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.42 }}
              className="glass-card"
              style={{ padding: '1.5rem 1.75rem', marginBottom: '2rem', border: '1.5px solid rgba(124,58,237,0.2)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CreditCard size={20} color="#7C3AED" />
                  </div>
                  <div>
                    <h2 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '1.3rem', color: C.text, margin: 0 }}>Cotizaciones CuidameDoc</h2>
                    <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>
                      Planes de tratamiento cerrados en CuidameDoc con medicamentos/procedimientos/seguimiento cotizados
                    </p>
                  </div>
                </div>
                {externalQuotes.length > 0 && (
                  <span style={{ background: 'rgba(124,58,237,0.1)', color: '#7C3AED', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 99 }}>
                    {externalQuotes.length} pendiente{externalQuotes.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {externalQuotes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', background: 'rgba(124,58,237,0.03)', borderRadius: 12, border: `1px dashed ${C.borderLight}` }}>
                  <CheckCircle2 size={32} color="#16A34A" style={{ margin: '0 auto 10px' }} />
                  <p style={{ fontSize: 14, fontWeight: 600, color: C.textMuted, margin: 0 }}>Sin cotizaciones pendientes</p>
                  <p style={{ fontSize: 12, color: C.textMuted, margin: '4px 0 0' }}>Cuando la Dra. Ximena cierre una historia clínica con plan de tratamiento en CuidameDoc, la cotización aparecerá aquí.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <AnimatePresence>
                    {externalQuotes.map(q => (
                      <motion.div
                        key={q.id}
                        layout
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 12, height: 0, marginBottom: 0, padding: 0, overflow: 'hidden' }}
                        style={{ background: C.white, borderRadius: 12, padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: 10, border: `1px solid rgba(124,58,237,0.2)` }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
                          <div style={{ flex: 1, minWidth: 180 }}>
                            <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 2px' }}>{q.patientName}</p>
                            <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>
                              {q.patientEmail}
                              {q.externalReference && ` · ${q.externalReference}`}
                              {q.professionalName && ` · ${q.professionalName}`}
                            </p>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <p style={{ fontSize: 16, fontWeight: 800, color: '#7C3AED', margin: 0 }}>{fmt(q.totalAmount)}</p>
                            <p style={{ fontSize: 11, color: C.textMuted, margin: 0 }}>
                              {new Date(q.createdAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                            </p>
                          </div>
                        </div>

                        <div style={{ borderTop: `1px solid ${C.borderLight}`, paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {q.items.map((item, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.textBrown }}>
                              <span>{item.name} {item.quantity > 1 ? `× ${item.quantity}` : ''}</span>
                              <span style={{ fontWeight: 600 }}>{fmt(item.subtotal)}</span>
                            </div>
                          ))}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                          <button onClick={() => handleConfirmQuote(q.id, q.patientName)} disabled={confirmingQuoteId === q.id}
                            style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#16A34A,#22C55E)', color: C.white, fontSize: 11, fontWeight: 700, cursor: confirmingQuoteId === q.id ? 'not-allowed' : 'pointer', opacity: confirmingQuoteId === q.id ? 0.6 : 1, transition: 'all 0.2s' }}>
                            {confirmingQuoteId === q.id ? '…' : '✓ Confirmar pago'}
                          </button>
                          <button onClick={() => handleRejectQuote(q.id, q.patientName)} disabled={rejectingQuoteId === q.id}
                            style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#B91C1C,#DC2626)', color: C.white, fontSize: 11, fontWeight: 700, cursor: rejectingQuoteId === q.id ? 'not-allowed' : 'pointer', opacity: rejectingQuoteId === q.id ? 0.6 : 1, transition: 'all 0.2s' }}>
                            {rejectingQuoteId === q.id ? '…' : '✗ Rechazar'}
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>}
```

Note: `confirmedQuotesTotal` is fetched and tracked (Step 3/4) but not rendered anywhere in this block, matching Diana's own component exactly — it exists for potential future use in the KPI cards, out of scope to wire further here (don't add unrequested KPI-card changes).

- [ ] **Step 8: Verify**

Run: `cd medisxime-landing && npx tsc -b --noEmit`
Expected: identical to whatever pre-existing baseline was captured for this repo during the Dirección A project (compare against `C:\Users\julia\Downloads\Opieka\medisXime\.superpowers\sdd\baseline-tsc-errors.txt` if still present, or capture a fresh baseline first if not — zero new errors either way).

Run: `cd medisxime-landing && npm run build`
Expected: succeeds.

- [ ] **Step 9: Commit**

```bash
git add medisxime-landing/src/components/admin/FinanzasDashboard.tsx
git commit -m "feat(finanzas): add Cotizaciones CuidameDoc tab"
```

---

## Explicitly out of scope

- Registering Ximena's `professional_integrations` row in CuidameDoc (done later from CuidameDoc's admin screen, once this and its two sibling projects are deployed).
- Deploying anything.
- Backfilling KPI totals on the "Planes"/main dashboard cards to include confirmed-quote revenue (`confirmedQuotesTotal` is tracked but not surfaced elsewhere, matching Diana's own scope).
