# Rediseño de Tipos de Cuenta (Account Types Redesign) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand medisXime's account-creation system from 3 roles (Pacientes, Personal Médico, Administrador) to 4 by adding "Empresas" (`EMPRESA`), redesign the "Nueva Cuenta" wizard (`CreateProfessionalModal.tsx`) with role-specific fields tied to the clinic's services, and migrate `UsuariosDashboard.tsx` / `UsuarioCard.tsx` from the legacy purple/blue medisxime palette to the medisXime café/crema/terracota palette.

**Architecture:** Add a new Postgres enum value (`EMPRESA`) and 11 nullable profile columns via migration `016_account_types_expansion.sql`. Widen the backend `UserRole`/DTO/repository types so `POST /api/professionals` accepts any of the 4 roles and persists the new columns — the existing role-dispatch logic in `professional.service.ts` (`if (dto.role && dto.role !== 'PROFESSIONAL') return UserRepository.create(...) else return ProfessionalRepository.create(...)`) is reused unchanged, but requires `CreateProfessionalDTO` and `RegisterDTO` to declare the same 11 new optional fields so the shared `dto` object type-checks against both repositories. On the frontend, swap the `C` design-token object VALUES in `UsuariosDashboard.tsx` and `CreateProfessionalModal.tsx` to the medisXime palette (cascades automatically via `C.*` references), replace remaining literal purple/blue hex codes, rewrite `UsuarioCard.tsx`'s `ROLE_CONFIG` for 4 roles, and restructure the wizard's 4 steps to be role-conditional (Pacientes / Personal Médico / Empresas / Administrador).

**Tech Stack:** pnpm monorepo — `apps/backend` (Express + pg + tsx + TypeScript), `medisxime-landing` (Vite + React + TypeScript, Tailwind v4 + inline-style components). PostgreSQL migrations run via `pnpm --filter @medisxime/backend run migrate`. Type-check commands: backend `pnpm --filter @medisxime/backend exec tsc --noEmit`, frontend `pnpm --filter medisxime-landing exec tsc -b`.

---

## Task 1: Migración 016 — Expansión de tipos de cuenta (DB)

**Files:**
- Create: `apps/backend/migrations/016_account_types_expansion.sql`

- [ ] **Step 1: Crear el archivo de migración**

```sql
-- ============================================================
-- Migration 016: Account Types Expansion
-- ============================================================
-- Agrega el rol 'EMPRESA' al enum user_role y nuevas columnas
-- de perfil para Pacientes / Personal Médico / Empresas.
-- Run: psql -d medis_db -f migrations/016_account_types_expansion.sql
-- ============================================================

-- 1. Nuevo valor de enum para cuentas tipo Empresa
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'EMPRESA';

-- 2. Identidad (Pacientes, Personal Médico, Administrador)
ALTER TABLE users ADD COLUMN IF NOT EXISTS id_type   VARCHAR(30);
ALTER TABLE users ADD COLUMN IF NOT EXISTS id_number VARCHAR(30);

-- 3. Personal Médico
ALTER TABLE users ADD COLUMN IF NOT EXISTS professional_license VARCHAR(50);

-- 4. Pacientes
ALTER TABLE users ADD COLUMN IF NOT EXISTS eps         VARCHAR(150);
ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date  DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS blood_type  VARCHAR(5);

-- 5. Empresas
ALTER TABLE users ADD COLUMN IF NOT EXISTS nit                  VARCHAR(30);
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_sector       VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_name         VARCHAR(150);
ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_position     VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS interested_services  TEXT[];
```

Todas las columnas son `NULL`able. `ALTER TYPE ... ADD VALUE` y los `ALTER TABLE` subsiguientes no referencian el valor `'EMPRESA'` en la misma migración, así que es seguro ejecutarlos en el mismo script (`run-migration.ts` ejecuta cada archivo `.sql` con un único `pool.query(sql)`).

- [ ] **Step 2: Ejecutar la migración**

Run: `pnpm --filter @medisxime/backend run migrate`

Expected output includes:
```
🔄 Running migration 016_account_types_expansion.sql...
✅ Migration 016_account_types_expansion.sql successful!
...
🌟 ALL MIGRATIONS APPLIED SUCCESSFULLY! 🌟
```

- [ ] **Step 3: Commit**

```bash
git add apps/backend/migrations/016_account_types_expansion.sql
git commit -m "feat(db): add EMPRESA role and account-type profile columns (migration 016)"
```

---

## Task 2: Backend types — `auth.types.ts`

**Files:**
- Modify: `apps/backend/src/types/auth.types.ts`

- [ ] **Step 1: Reemplazar todo el contenido del archivo**

Use the Write tool to replace the entire content of `apps/backend/src/types/auth.types.ts` with:

```ts
// ─── Shared Domain Types ─────────────────────────────────────────────────────

export type UserRole = 'USER' | 'PROFESSIONAL' | 'EMPRESA' | 'ADMIN';

/** Row as returned by the DB (never expose password_hash to the client) */
export interface UserRecord {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  role: UserRole;
  bio: string | null;
  specialties: string[] | null;
  instagram_url: string | null;
  avatar_url: string | null;
  is_active: boolean;
  is_verified: boolean;
  created_at: Date;
  updated_at: Date;
  id_type: string | null;
  id_number: string | null;
  professional_license: string | null;
  eps: string | null;
  birth_date: Date | null;
  blood_type: string | null;
  nit: string | null;
  company_sector: string | null;
  contact_name: string | null;
  contact_position: string | null;
  interested_services: string[] | null;
}

/** Safe user object sent to the client */
export interface UserPublic {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: UserRole;
  bio: string | null;
  specialties: string[] | null;
  instagramUrl: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  idType: string | null;
  idNumber: string | null;
  professionalLicense: string | null;
  eps: string | null;
  birthDate: string | null;
  bloodType: string | null;
  nit: string | null;
  companySector: string | null;
  contactName: string | null;
  contactPosition: string | null;
  interestedServices: string[] | null;
}

// ─── Auth DTOs ────────────────────────────────────────────────────────────────

export interface RegisterDTO {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: 'USER' | 'PROFESSIONAL' | 'EMPRESA' | 'ADMIN';
  avatarUrl?: string;
  idType?: string;
  idNumber?: string;
  professionalLicense?: string;
  eps?: string;
  birthDate?: string;
  bloodType?: string;
  nit?: string;
  companySector?: string;
  contactName?: string;
  contactPosition?: string;
  interestedServices?: string[];
}

export interface UpdateUserDTO {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  bio?: string | null;
  instagramUrl?: string | null;
  avatarUrl?: string | null;
  isActive?: boolean;
  isVerified?: boolean;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface JwtPayload {
  sub: string;         // user id
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/backend/src/types/auth.types.ts
git commit -m "feat(backend): widen UserRole/UserRecord/UserPublic/RegisterDTO for EMPRESA and new profile fields"
```

---

## Task 3: Backend types — `professional.types.ts`

**Files:**
- Modify: `apps/backend/src/types/professional.types.ts`

- [ ] **Step 1: Reemplazar todo el contenido del archivo**

Use the Write tool to replace the entire content of `apps/backend/src/types/professional.types.ts` with:

```ts
export type ProfessionalStatus = 'available' | 'in_session' | 'offline'

// ─── DB row shape ─────────────────────────────────────────────────────────────
export interface ProfessionalRecord {
  id:                string
  email:             string
  first_name:        string
  last_name:         string
  phone:             string | null
  role:              string
  bio:               string | null
  specialties:       string[] | null
  instagram_url:     string | null
  avatar_url:        string | null
  status:            ProfessionalStatus
  is_active:         boolean
  is_verified:       boolean
  professional_type: 'dependiente' | 'independiente'
  created_at:        Date
  updated_at:        Date
  // joined from rating summary
  avg_score:     string | null
  total_reviews: string | null
  // identity & role-specific fields
  id_type:              string | null
  id_number:            string | null
  professional_license: string | null
}

// ─── API response shape ───────────────────────────────────────────────────────
export interface ProfessionalPublic {
  id:               string
  email:            string
  firstName:        string
  lastName:         string
  phone:            string | null
  bio:              string | null
  specialties:      string[]
  instagramUrl:     string | null
  avatarUrl:        string | null
  status:           ProfessionalStatus
  isActive:         boolean
  isVerified:       boolean
  professionalType: 'dependiente' | 'independiente'
  avgScore:         number
  totalReviews:     number
  createdAt:        string
  idType:              string | null
  idNumber:            string | null
  professionalLicense: string | null
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────
export interface CreateProfessionalDTO {
  email:            string
  password:         string
  firstName:        string
  lastName:         string
  phone?:           string
  bio?:             string
  specialties?:     string[]
  instagramUrl?:    string
  avatarUrl?:       string
  professionalType?: 'dependiente' | 'independiente'
  idType?:               string
  idNumber?:             string
  professionalLicense?:  string
  eps?:                  string
  birthDate?:            string
  bloodType?:            string
  nit?:                  string
  companySector?:        string
  contactName?:          string
  contactPosition?:      string
  interestedServices?:   string[]
}

export interface UpdateProfessionalDTO {
  firstName?:   string
  lastName?:    string
  phone?:       string
  bio?:         string
  specialties?: string[]
  instagramUrl?: string
  avatarUrl?:   string
  isActive?:    boolean
  isVerified?:  boolean
}

// ─── Stats ────────────────────────────────────────────────────────────────────
export interface ProfessionalStats {
  totalProfessionals:  number
  activeProfessionals: number
  avgSatisfaction:     number
  weeklyBookings:      number
  totalDisciplines:    number
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/backend/src/types/professional.types.ts
git commit -m "feat(backend): add identity and EMPRESA/USER fields to CreateProfessionalDTO and ProfessionalRecord/Public"
```

---

## Task 4: Backend repository — `user.repository.ts`

**Files:**
- Modify: `apps/backend/src/repositories/user.repository.ts:6-22` (toPublic)
- Modify: `apps/backend/src/repositories/user.repository.ts:46-63` (create)

- [ ] **Step 1: Actualizar `toPublic()` para mapear los 11 campos nuevos**

Edit `apps/backend/src/repositories/user.repository.ts`. Replace:

```ts
function toPublic(u: UserRecord): UserPublic {
  return {
    id:          u.id,
    email:       u.email,
    firstName:   u.first_name,
    lastName:    u.last_name,
    phone:       u.phone,
    role:        u.role,
    bio:         u.bio,
    specialties: u.specialties,
    instagramUrl:u.instagram_url,
    avatarUrl:   u.avatar_url,
    isActive:    u.is_active,
    isVerified:  u.is_verified,
    createdAt:   u.created_at.toISOString(),
  };
}
```

with:

```ts
function toPublic(u: UserRecord): UserPublic {
  return {
    id:          u.id,
    email:       u.email,
    firstName:   u.first_name,
    lastName:    u.last_name,
    phone:       u.phone,
    role:        u.role,
    bio:         u.bio,
    specialties: u.specialties,
    instagramUrl:u.instagram_url,
    avatarUrl:   u.avatar_url,
    isActive:    u.is_active,
    isVerified:  u.is_verified,
    createdAt:   u.created_at.toISOString(),
    idType:              u.id_type,
    idNumber:            u.id_number,
    professionalLicense: u.professional_license,
    eps:                 u.eps,
    birthDate:           u.birth_date ? u.birth_date.toISOString().slice(0, 10) : null,
    bloodType:           u.blood_type,
    nit:                 u.nit,
    companySector:       u.company_sector,
    contactName:         u.contact_name,
    contactPosition:     u.contact_position,
    interestedServices:  u.interested_services,
  };
}
```

- [ ] **Step 2: Expandir el INSERT de `create()` de 6 a 17 columnas**

Replace:

```ts
  /** Create a new user, returns public profile */
  async create(dto: RegisterDTO & { passwordHash: string }): Promise<UserPublic> {
    const { rows } = await pool.query<UserRecord>(
      `INSERT INTO users
        (email, password_hash, first_name, last_name, phone, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        dto.email.toLowerCase().trim(),
        dto.passwordHash,
        dto.firstName.trim(),
        dto.lastName.trim(),
        dto.phone?.trim() ?? null,
        dto.role ?? 'USER',
      ]
    );
    return toPublic(rows[0]);
  },
```

with:

```ts
  /** Create a new user, returns public profile */
  async create(dto: RegisterDTO & { passwordHash: string }): Promise<UserPublic> {
    const { rows } = await pool.query<UserRecord>(
      `INSERT INTO users
        (email, password_hash, first_name, last_name, phone, role,
         avatar_url, id_type, id_number, eps, birth_date, blood_type,
         nit, company_sector, contact_name, contact_position, interested_services)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       RETURNING *`,
      [
        dto.email.toLowerCase().trim(),
        dto.passwordHash,
        dto.firstName.trim(),
        dto.lastName.trim(),
        dto.phone?.trim() ?? null,
        dto.role ?? 'USER',
        dto.avatarUrl?.trim() ?? null,
        dto.idType?.trim() ?? null,
        dto.idNumber?.trim() ?? null,
        dto.eps?.trim() ?? null,
        dto.birthDate ?? null,
        dto.bloodType?.trim() ?? null,
        dto.nit?.trim() ?? null,
        dto.companySector?.trim() ?? null,
        dto.contactName?.trim() ?? null,
        dto.contactPosition?.trim() ?? null,
        dto.interestedServices ?? null,
      ]
    );
    return toPublic(rows[0]);
  },
```

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/repositories/user.repository.ts
git commit -m "feat(backend): persist and return new account-type profile fields in UserRepository"
```

---

## Task 5: Backend repository — `professional.repository.ts`

**Files:**
- Modify: `apps/backend/src/repositories/professional.repository.ts:13-32` (toPublic)
- Modify: `apps/backend/src/repositories/professional.repository.ts:71-93` (create)

- [ ] **Step 1: Actualizar `toPublic()` para mapear `idType`/`idNumber`/`professionalLicense`**

Edit `apps/backend/src/repositories/professional.repository.ts`. Replace:

```ts
function toPublic(r: ProfessionalRecord): ProfessionalPublic {
  return {
    id:               r.id,
    email:            r.email,
    firstName:        r.first_name,
    lastName:         r.last_name,
    phone:            r.phone,
    bio:              r.bio,
    specialties:      r.specialties ?? [],
    instagramUrl:     r.instagram_url,
    avatarUrl:        r.avatar_url,
    status:           r.status,
    isActive:         r.is_active,
    isVerified:       r.is_verified,
    professionalType: r.professional_type ?? 'dependiente',
    avgScore:         r.avg_score ? parseFloat(r.avg_score) : 0,
    totalReviews:     r.total_reviews ? parseInt(r.total_reviews, 10) : 0,
    createdAt:        r.created_at.toISOString(),
  }
}
```

with:

```ts
function toPublic(r: ProfessionalRecord): ProfessionalPublic {
  return {
    id:               r.id,
    email:            r.email,
    firstName:        r.first_name,
    lastName:         r.last_name,
    phone:            r.phone,
    bio:              r.bio,
    specialties:      r.specialties ?? [],
    instagramUrl:     r.instagram_url,
    avatarUrl:        r.avatar_url,
    status:           r.status,
    isActive:         r.is_active,
    isVerified:       r.is_verified,
    professionalType: r.professional_type ?? 'dependiente',
    avgScore:         r.avg_score ? parseFloat(r.avg_score) : 0,
    totalReviews:     r.total_reviews ? parseInt(r.total_reviews, 10) : 0,
    createdAt:        r.created_at.toISOString(),
    idType:              r.id_type,
    idNumber:            r.id_number,
    professionalLicense: r.professional_license,
  }
}
```

- [ ] **Step 2: Expandir el INSERT de `create()` con `id_type`, `id_number`, `professional_license`**

Replace:

```ts
  /** Create a professional (insert as PROFESSIONAL role) */
  async create(dto: CreateProfessionalDTO & { passwordHash: string }): Promise<ProfessionalPublic> {
    const { rows } = await pool.query<ProfessionalRecord>(`
      INSERT INTO users
        (email, password_hash, first_name, last_name, phone, role,
         bio, specialties, instagram_url, avatar_url, status, is_verified, professional_type)
      VALUES ($1,$2,$3,$4,$5,'PROFESSIONAL',$6,$7,$8,$9,'offline',TRUE,$10)
      RETURNING *,
        NULL::NUMERIC AS avg_score,
        NULL::BIGINT  AS total_reviews
    `, [
      dto.email.toLowerCase().trim(),
      dto.passwordHash,
      dto.firstName.trim(),
      dto.lastName.trim(),
      dto.phone?.trim() ?? null,
      dto.bio?.trim() ?? null,
      dto.specialties ?? null,
      dto.instagramUrl?.trim() ?? null,
      dto.avatarUrl?.trim() ?? null,
      dto.professionalType ?? 'dependiente',
    ])
    return toPublic(rows[0])
  },
```

with:

```ts
  /** Create a professional (insert as PROFESSIONAL role) */
  async create(dto: CreateProfessionalDTO & { passwordHash: string }): Promise<ProfessionalPublic> {
    const { rows } = await pool.query<ProfessionalRecord>(`
      INSERT INTO users
        (email, password_hash, first_name, last_name, phone, role,
         bio, specialties, instagram_url, avatar_url, status, is_verified, professional_type,
         id_type, id_number, professional_license)
      VALUES ($1,$2,$3,$4,$5,'PROFESSIONAL',$6,$7,$8,$9,'offline',TRUE,$10,$11,$12,$13)
      RETURNING *,
        NULL::NUMERIC AS avg_score,
        NULL::BIGINT  AS total_reviews
    `, [
      dto.email.toLowerCase().trim(),
      dto.passwordHash,
      dto.firstName.trim(),
      dto.lastName.trim(),
      dto.phone?.trim() ?? null,
      dto.bio?.trim() ?? null,
      dto.specialties ?? null,
      dto.instagramUrl?.trim() ?? null,
      dto.avatarUrl?.trim() ?? null,
      dto.professionalType ?? 'dependiente',
      dto.idType?.trim() ?? null,
      dto.idNumber?.trim() ?? null,
      dto.professionalLicense?.trim() ?? null,
    ])
    return toPublic(rows[0])
  },
```

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/repositories/professional.repository.ts
git commit -m "feat(backend): persist and return id_type/id_number/professional_license in ProfessionalRepository"
```

---

## Task 6: Backend type-check verification

**Files:** none (verification only)

- [ ] **Step 1: Ejecutar el type-check del backend**

Run: `pnpm --filter @medisxime/backend exec tsc --noEmit`

Expected: no output, exit code 0 (no type errors). This confirms:
- `UserRepository.create()` and `ProfessionalRepository.create()` compile against the widened `RegisterDTO` / `CreateProfessionalDTO`.
- `professional.service.ts`'s `UserRepository.create({ ...dto, role: dto.role, passwordHash })` and `ProfessionalRepository.create({ ...dto, passwordHash })` both type-check against the same `dto: CreateProfessionalDTO & { role?: UserRole }` parameter, since `CreateProfessionalDTO` and `RegisterDTO` now declare the same 11 optional fields.

If errors appear, fix the mismatched field name/type before continuing — do not proceed to frontend tasks with a red backend type-check.

---

## Task 7: Frontend types — `admin/types.ts`

**Files:**
- Modify: `medisxime-landing/src/components/admin/types.ts`

- [ ] **Step 1: Reemplazar todo el contenido del archivo**

Use the Write tool to replace the entire content of `medisxime-landing/src/components/admin/types.ts` with:

```ts
export interface User {
  id: string;
  nombre: string;
  documento: string;
  rol: 'Paciente' | 'Personal Médico' | 'Empresa' | 'Administrador';
  estado: 'Activa' | 'Inactiva';
  imagen?: string;
  especialidades?: string[];
  raw?: any;
}
```

- [ ] **Step 2: Commit**

```bash
git add medisxime-landing/src/components/admin/types.ts
git commit -m "feat(frontend): widen User.rol union to the 4 medisXime account types"
```

---

## Task 8: Frontend — `UsuarioCard.tsx` full rewrite (4 roles + medisXime palette)

**Files:**
- Modify: `medisxime-landing/src/components/admin/UsuarioCard.tsx` (228 lines, full rewrite)

This file is small enough, and changes pervasively enough (ROLE_CONFIG 3→4 entries, every literal purple/blue color, two fonts), that a full-file rewrite is simpler and less error-prone than many targeted edits.

- [ ] **Step 1: Reemplazar todo el contenido del archivo**

Use the Write tool to replace the entire content of `medisxime-landing/src/components/admin/UsuarioCard.tsx` with:

```tsx
import React, { useState } from 'react';
import type { User as UserType } from './types';
import { User, Shield, Stethoscope, Building2, CheckCircle2, XCircle, Eye, Edit3, Trash2, Power } from 'lucide-react';

interface UsuarioCardProps {
  user: UserType;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleStatus?: (newStatus: boolean) => void;
}

const ROLE_CONFIG: Record<string, { bg: string; border: string; color: string; icon: React.ElementType; label: string }> = {
  Administrador: {
    bg: 'linear-gradient(135deg, rgba(92,58,40,0.12), rgba(92,58,40,0.06))',
    border: 'rgba(92,58,40,0.2)',
    color: '#5C3A28',
    icon: Shield,
    label: 'Administrador',
  },
  'Personal Médico': {
    bg: 'linear-gradient(135deg, rgba(156,74,46,0.12), rgba(156,74,46,0.06))',
    border: 'rgba(156,74,46,0.2)',
    color: '#9C4A2E',
    icon: Stethoscope,
    label: 'Personal Médico',
  },
  Paciente: {
    bg: 'linear-gradient(135deg, rgba(122,100,82,0.12), rgba(122,100,82,0.06))',
    border: 'rgba(122,100,82,0.2)',
    color: '#7A6452',
    icon: User,
    label: 'Paciente',
  },
  Empresa: {
    bg: 'linear-gradient(135deg, rgba(176,141,92,0.12), rgba(176,141,92,0.06))',
    border: 'rgba(176,141,92,0.2)',
    color: '#B08D5C',
    icon: Building2,
    label: 'Empresa',
  },
};

interface ActionBtnProps {
  icon: React.ElementType;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  color: string;
  hoverBg: string;
  hoverColor?: string;
}

const ActionBtn: React.FC<ActionBtnProps> = ({ icon: Icon, label, onClick, color, hoverBg, hoverColor }) => {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      title={label}
      style={{
        flex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
        padding: '7px 0',
        borderRadius: 8,
        border: 'none',
        background: hov ? hoverBg : 'transparent',
        color: hov ? (hoverColor ?? color) : color,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        fontSize: '0.68rem',
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase' as const,
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <Icon size={13} strokeWidth={2.2} />
      {label}
    </button>
  );
};

export const UsuarioCard: React.FC<UsuarioCardProps> = ({ user, onView, onEdit, onDelete, onToggleStatus }) => {
  const [hovered, setHovered] = useState(false);
  const role = ROLE_CONFIG[user.rol] ?? ROLE_CONFIG.Paciente;
  const RoleIcon = role.icon;
  const isActive = user.estado === 'Activa';

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#FFFFFF',
        borderRadius: '1.25rem',
        border: `1px solid ${hovered ? 'rgba(92,58,40,0.2)' : '#E6D9C7'}`,
        boxShadow: hovered
          ? '0 20px 50px rgba(92,58,40,0.1), 0 4px 12px rgba(0,0,0,0.04)'
          : '0 4px 16px rgba(0,0,0,0.04)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column' as const,
        position: 'relative' as const,
      }}
    >
      {/* Accent bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: isActive
          ? 'linear-gradient(90deg, #22C55E, #16A34A)'
          : 'linear-gradient(90deg, #F43F5E, #BE123C)',
        opacity: hovered ? 1 : 0.5,
        transition: 'opacity 0.3s ease',
      }} />

      {/* Main content */}
      <div style={{ padding: '1.5rem 1.25rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', flex: 1 }}>
        {/* Avatar */}
        <div style={{ position: 'relative', marginBottom: '0.85rem' }}>
          <div style={{
            width: 72, height: 72,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #F5EDE1, #E6D9C7)',
            border: `3px solid ${hovered ? 'rgba(92,58,40,0.25)' : '#E6D9C7'}`,
            overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'border-color 0.3s ease',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}>
            {user.imagen ? (
              <img src={user.imagen} alt={user.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <User size={30} color="#B0A08C" />
            )}
          </div>
          <div style={{
            position: 'absolute', bottom: 1, right: 1,
            width: 18, height: 18, borderRadius: '50%',
            background: isActive ? '#22C55E' : '#F43F5E',
            border: '2px solid #FFF',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 2px 6px ${isActive ? 'rgba(34,197,94,0.4)' : 'rgba(244,63,94,0.4)'}`,
          }}>
            {isActive ? <CheckCircle2 size={9} color="#FFF" /> : <XCircle size={9} color="#FFF" />}
          </div>
        </div>

        {/* Name */}
        <h3 style={{
          fontFamily: '"Cormorant Garamond", Georgia, serif',
          fontSize: '1rem', fontWeight: 600, color: '#3D2B1F',
          margin: '0 0 0.15rem', lineHeight: 1.3,
        }}>{user.nombre}</h3>

        {/* Email */}
        <p style={{
          fontSize: '0.72rem', color: '#7A6452', margin: '0 0 0.65rem', fontWeight: 500,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%',
        }}>{user.documento}</p>

        {/* Role */}
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '4px 10px', borderRadius: '9999px',
          background: role.bg, border: `1px solid ${role.border}`,
          fontSize: '0.68rem', fontWeight: 700, color: role.color,
          letterSpacing: '0.05em', textTransform: 'uppercase',
        }}>
          <RoleIcon size={10} strokeWidth={2.5} />
          {role.label}
        </span>
      </div>

      {/* Specialties */}
      {user.especialidades && user.especialidades.length > 0 && (
        <div style={{
          borderTop: '1px solid #E6D9C7',
          padding: '0.65rem 1rem',
          background: 'rgba(245,237,225,0.5)',
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', justifyContent: 'center' }}>
            {user.especialidades.slice(0, 3).map((esp, idx) => (
              <span key={idx} style={{
                fontSize: '0.65rem', color: '#B0A08C', background: '#FFF',
                padding: '2px 7px', borderRadius: 5, border: '1px solid #E6D9C7',
                fontWeight: 600, letterSpacing: '0.02em',
              }}>{esp}</span>
            ))}
            {user.especialidades.length > 3 && (
              <span style={{
                fontSize: '0.65rem', color: '#9C4A2E',
                background: 'rgba(156,74,46,0.08)', padding: '2px 7px',
                borderRadius: 5, border: '1px solid rgba(156,74,46,0.2)', fontWeight: 600,
              }}>+{user.especialidades.length - 3}</span>
            )}
          </div>
        </div>
      )}

      {/* Action buttons row */}
      <div style={{
        borderTop: '1px solid #E6D9C7',
        padding: '0.5rem 0.5rem',
        display: 'flex',
        gap: 2,
        background: '#FFFBF5',
      }}>
        <ActionBtn
          icon={Eye} label="Ver" color="#B0A08C" hoverBg="rgba(92,58,40,0.08)" hoverColor="#5C3A28"
          onClick={(e) => { e.stopPropagation(); onView?.(); }}
        />
        <ActionBtn
          icon={Edit3} label="Editar" color="#B0A08C" hoverBg="rgba(156,74,46,0.08)" hoverColor="#9C4A2E"
          onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
        />
        <ActionBtn
          icon={Power}
          label={isActive ? 'Desact.' : 'Activar'}
          color={isActive ? '#B0A08C' : '#16A34A'}
          hoverBg={isActive ? 'rgba(244,63,94,0.08)' : 'rgba(34,197,94,0.08)'}
          hoverColor={isActive ? '#E11D48' : '#16A34A'}
          onClick={(e) => { e.stopPropagation(); onToggleStatus?.(!isActive); }}
        />
        <ActionBtn
          icon={Trash2} label="Borrar" color="#7A6452" hoverBg="rgba(244,63,94,0.08)" hoverColor="#E11D48"
          onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
        />
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add medisxime-landing/src/components/admin/UsuarioCard.tsx
git commit -m "feat(frontend): rewrite UsuarioCard with 4-role config and medisXime palette"
```

---

## Task 9: UsuariosDashboard.tsx — design tokens and sidebar branding

`UsuariosDashboard.tsx` still uses the old purple/blue "medisxime" `C` design tokens,
the `"Bodoni Moda"`/`"Hanken Grotesk"` font stack, and a sidebar logo block that reads
"A" / "MEDIS" / "Estudio Admin". This task swaps the token values and fonts to the
medisXime palette (matching `MainDashboard.tsx`) and replaces the sidebar logo block
with the confirmed "XC" / "MedisXime" / "Consultorio Admin" pattern.

**Files:**
- Modify: `medisxime-landing/src/components/admin/UsuariosDashboard.tsx:17-32` (design tokens)
- Modify: `medisxime-landing/src/components/admin/UsuariosDashboard.tsx:382-393` (sidebar logo)

- [ ] **Step 1: Swap the `C` design tokens to the medisXime palette**

In `medisxime-landing/src/components/admin/UsuariosDashboard.tsx`, replace:

```ts
const C = {
  gold: '#8B5CF6',
  goldLight: '#3B82F6',
  bg: '#FAFAFA',
  bgPanel: '#F3F0FB',
  white: '#FFFFFF',
  text: '#1B1C1C',
  textBrown: '#475569',
  textMedium: '#5E5E5E',
  textMuted: '#94A3B8',
  border: '#DDD6FE',
  borderLight: '#DDD6FE',
}
```

with:

```ts
const C = {
  gold: '#5C3A28',
  goldLight: '#9C4A2E',
  bg: '#FFFBF5',
  bgPanel: '#F5EDE1',
  white: '#FFFFFF',
  text: '#3D2B1F',
  textBrown: '#7A6452',
  textMedium: '#7A6452',
  textMuted: '#B0A08C',
  border: '#E6D9C7',
  borderLight: '#E6D9C7',
}
```

- [ ] **Step 2: Swap the font stack**

Replace:

```ts
const FONT_BODONI = '"Bodoni Moda", Georgia, serif'
const FONT_INTER = '"Hanken Grotesk", Inter, system-ui, sans-serif'
```

with:

```ts
const FONT_BODONI = '"Cormorant Garamond", Georgia, serif'
const FONT_INTER = 'Inter, sans-serif'
```

- [ ] **Step 3: Replace the sidebar logo block with the MedisXime "XC" pattern**

Replace:

```tsx
          {/* Logo */}
          <div style={{ padding: '28px 20px 22px', borderBottom: `1px solid ${C.borderLight}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 48, background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 4px 12px rgba(139,92,246,0.3)` }}>
                <span style={{ fontFamily: FONT_BODONI, fontSize: 22, fontStyle: 'italic', fontWeight: 700, color: C.white }}>A</span>
              </div>
              <div>
                <div style={{ fontFamily: FONT_BODONI, fontSize: 18, fontWeight: 700, color: C.gold, lineHeight: 1.2 }}>MEDIS</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 2 }}>Estudio Admin</div>
              </div>
            </div>
          </div>
```

with:

```tsx
          {/* Logo */}
          <div style={{ padding: '28px 20px 22px', borderBottom: `1px solid ${C.borderLight}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 48, background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 4px 12px rgba(92,58,40,0.3)` }}>
                <span style={{ fontFamily: FONT_BODONI, fontSize: 18, fontWeight: 700, color: C.white }}>XC</span>
              </div>
              <div>
                <div style={{ fontFamily: FONT_BODONI, fontSize: 17, fontWeight: 600, color: C.gold, lineHeight: 1.2 }}>MedisXime</div>
                <div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 2 }}>Consultorio Admin</div>
              </div>
            </div>
          </div>
```

- [ ] **Step 4: Commit**

```bash
git add medisxime-landing/src/components/admin/UsuariosDashboard.tsx
git commit -m "feat(frontend): migrate UsuariosDashboard design tokens and sidebar branding to medisXime palette"
```

---

## Task 10: UsuariosDashboard.tsx — role taxonomy, filters, and remaining literal colors

This task updates the role taxonomy (`RoleFilter`, `mappedUsers`, `matchRole`, the role
filter pills) to the 4 medisXime account types from
`docs/superpowers/specs/2026-06-13-account-types-redesign-design.md` §4, fixes the
footer branding text, and replaces the remaining literal purple/blue color codes left
over from the old medisxime palette (everything not already covered by Task 9's `C`
token swap).

Note: the gray `#94A3B8` at `UsuariosDashboard.tsx:555` (the secondary text inside the
red error banner) is intentionally left unchanged — it is a neutral gray used inside a
semantic error alert, not part of the purple/blue brand palette, so it is not part of
this migration.

**Files:**
- Modify: `medisxime-landing/src/components/admin/UsuariosDashboard.tsx`

- [ ] **Step 1: Update `RoleFilter` and add a role-label lookup map**

Replace:

```ts
type RoleFilter = 'Todos' | 'Usuario' | 'Administrador' | 'Profesional'
type StatusFilter = 'Todos' | 'Activos' | 'Inactivos'
```

with:

```ts
type RoleFilter = 'Todos' | 'Pacientes' | 'Personal Médico' | 'Empresas' | 'Administrador'
type StatusFilter = 'Todos' | 'Activos' | 'Inactivos'

const ROLE_FILTER_MAP: Record<Exclude<RoleFilter, 'Todos'>, UserType['rol']> = {
  'Pacientes': 'Paciente',
  'Personal Médico': 'Personal Médico',
  'Empresas': 'Empresa',
  'Administrador': 'Administrador',
}
```

`ROLE_FILTER_MAP` translates the plural filter-pill labels (`RoleFilter`) to the
singular `User['rol']` values produced by `mappedUsers` in Step 2, so the role filter
pills actually match cards.

- [ ] **Step 2: Update the `role` → `rol` mapping in `mappedUsers`**

Replace:

```ts
  const mappedUsers = useMemo(() => users.map(u => ({
    id: u.id,
    nombre: `${u.firstName} ${u.lastName}`,
    documento: u.email,
    rol: u.role === 'ADMIN' ? 'Administrador' : u.role === 'USER' ? 'Usuario' : 'Profesional',
    estado: u.isActive ? 'Activa' : 'Inactiva',
    imagen: u.avatarUrl || undefined,
    especialidades: u.specialties || [],
    raw: u,
  } as UserType)), [users])
```

with:

```ts
  const mappedUsers = useMemo(() => users.map(u => ({
    id: u.id,
    nombre: `${u.firstName} ${u.lastName}`.trim(),
    documento: u.role === 'EMPRESA' ? (u.nit || u.email) : u.email,
    rol: u.role === 'ADMIN' ? 'Administrador'
      : u.role === 'EMPRESA' ? 'Empresa'
      : u.role === 'PROFESSIONAL' ? 'Personal Médico'
      : 'Paciente',
    estado: u.isActive ? 'Activa' : 'Inactiva',
    imagen: u.avatarUrl || undefined,
    especialidades: u.specialties || [],
    raw: u,
  } as UserType)), [users])
```

`.trim()` drops the trailing space for `EMPRESA` accounts, where `lastName` is stored
as `''` (per the spec's §2 note that `first_name` holds the Razón Social for Empresas).
For `EMPRESA` accounts, `documento` shows the NIT (falling back to email if `nit` is
not set) per spec §4.

- [ ] **Step 3: Fix the role filter match to use `ROLE_FILTER_MAP`**

Replace:

```ts
    const matchRole = roleFilter === 'Todos' || user.rol === roleFilter
```

with:

```ts
    const matchRole = roleFilter === 'Todos' || user.rol === ROLE_FILTER_MAP[roleFilter]
```

- [ ] **Step 4: Update the role filter pills to the 4 account types**

Replace:

```tsx
                          {(['Todos', 'Usuario', 'Administrador', 'Profesional'] as RoleFilter[]).map(r => (
                            <FilterPill key={r} label={r} active={roleFilter === r} onClick={() => setRoleFilter(r)} />
                          ))}
```

with:

```tsx
                          {(['Todos', 'Pacientes', 'Personal Médico', 'Empresas', 'Administrador'] as RoleFilter[]).map(r => (
                            <FilterPill key={r} label={r} active={roleFilter === r} onClick={() => setRoleFilter(r)} />
                          ))}
```

- [ ] **Step 5: Update the footer copyright text**

Replace:

```tsx
                  © 2026 MEDIS Estudio · Todos los derechos reservados
```

with:

```tsx
                  © 2026 MedisXime · Todos los derechos reservados
```

- [ ] **Step 6: Replace the old "gold" purple rgba triplet everywhere**

Using a find-and-replace across the whole file, replace every occurrence of the
substring:

```
139,92,246
```

with:

```
92,58,40
```

This is the RGB form of the old `C.gold` (`#8B5CF6`) and the new `C.gold` (`#5C3A28`).
It appears (with varying opacity values) in: the `FilterPill` active boxShadow, the
scrollbar thumb styles, the nav-item hover background, the sidebar "Nuevo Usuario"
button shadow, the topbar avatar border shadow, the main background radial gradient,
the `StatCard` props for "Total de Usuarios", the search-bar "Nuevo Usuario" button
shadow, the "Incorporar Usuario" add-card gradient/hover styles, and the empty-state
"Limpiar filtros" button shadow. (The sidebar logo's occurrence was already migrated in
Task 9, Step 3.)

- [ ] **Step 7: Replace the old "gold-light" blue rgba triplet everywhere**

Replace every occurrence of:

```
59,130,246
```

with:

```
156,74,46
```

This is the RGB form of the old `C.goldLight` (`#3B82F6`) and the new `C.goldLight`
(`#9C4A2E`). It appears in the search-input focus ring, the filter-toggle button active
background, and the "Incorporar Usuario" add-card gradient (both the hover and reset
states).

- [ ] **Step 8: Replace the skeleton/hover panel background**

Replace every occurrence of:

```
#F3F0FB
```

with:

```
#F5EDE1
```

This covers the 4 `SkeletonCard` placeholder backgrounds and the 2 sidebar nav-item
`onMouseEnter` hover backgrounds (this is the new `C.bgPanel` value; by this point
Task 9 has already updated the `C.bgPanel` definition itself, so only these 6 literal
occurrences remain).

- [ ] **Step 9: Replace the icon-circle background**

Replace every occurrence of:

```
#F0EDE8
```

with:

```
#E6D9C7
```

This covers the icon circle in the "Incorporar Usuario" add-card and the icon circle
in the empty-state ("Sin resultados") block.

- [ ] **Step 10: Replace the nav-icon muted color**

Replace every occurrence of:

```
#9E9492
```

with:

```
#B0A08C
```

This covers the inactive nav-item icon color and the two `ChevronDown`/`ChevronRight`
colors in the "Servicios" nav item.

- [ ] **Step 11: Replace the search-icon muted color**

Replace:

```
#A09990
```

with:

```
#B0A08C
```

This is the `Search` icon color in the search bar.

- [ ] **Step 12: Replace the toast background**

Replace every occurrence of:

```
#1B1C1C
```

with:

```
#3D2418
```

The toast currently uses `'#1B1C1C'` for both the `error` and `success` branches —
replace both with the medisXime "café muy oscuro" dark token.

- [ ] **Step 13: Replace the search-input background**

Replace:

```ts
                        background: '#FAFAFA', border: `1px solid ${C.borderLight}`, borderRadius: 12,
```

with:

```ts
                        background: '#FFFBF5', border: `1px solid ${C.borderLight}`, borderRadius: 12,
```

- [ ] **Step 14: Commit**

```bash
git add medisxime-landing/src/components/admin/UsuariosDashboard.tsx
git commit -m "feat(frontend): migrate UsuariosDashboard role taxonomy, filters and remaining colors to medisXime"
```

---

## Task 11: CreateProfessionalModal.tsx — constants, types, state and validation

This is the first of five tasks that redesign the "Nueva Cuenta" wizard
(`CreateProfessionalModal.tsx`) per
`docs/superpowers/specs/2026-06-13-account-types-redesign-design.md` §3. This task lays
the foundation: design tokens/fonts (medisXime palette, same treatment as Tasks 8-9),
the new `SPECIALTIES`/`SECTORS`/`SERVICES_OF_INTEREST`/`BLOOD_TYPES`/`ROLE_OPTIONS`/
`ROLE_LABELS` constants, the widened `AccountRole`/`FormData` types, the initial form
state, the `visibleSteps` rule, and `validate()`. Tasks 12-15 build the JSX for each
wizard step on top of these.

**Files:**
- Modify: `medisxime-landing/src/components/admin/CreateProfessionalModal.tsx:8-17` (design tokens)
- Modify: `medisxime-landing/src/components/admin/CreateProfessionalModal.tsx:33-36` (specialties constant)
- Modify: `medisxime-landing/src/components/admin/CreateProfessionalModal.tsx:50-66` (ID types, new constants, AccountRole, FormData)
- Modify: `medisxime-landing/src/components/admin/CreateProfessionalModal.tsx:109-114` (initial form state)
- Modify: `medisxime-landing/src/components/admin/CreateProfessionalModal.tsx` (`DISCIPLINES` → `SPECIALTIES` rename, all occurrences)
- Modify: `medisxime-landing/src/components/admin/CreateProfessionalModal.tsx:157` (`visibleSteps`)
- Modify: `medisxime-landing/src/components/admin/CreateProfessionalModal.tsx:161-180` (`validate`)

- [ ] **Step 1: Swap design tokens and fonts to the medisXime palette**

Replace:

```ts
// ─── Design tokens (same as AdminProfessionals) ───────────────────────────────
const C = {
  gold: '#8B5CF6', goldLight: '#3B82F6',
  bg: '#FFFFFF', bgPanel: '#F3F0FB', bgSecondary: '#F3F0FB',
  white: '#FFFFFF', text: '#1B1C1C', textBrown: '#475569',
  textMedium: '#5E5E5E', textMuted: '#94A3B8',
  border: '#DDD6FE', borderLight: '#DDD6FE',
}
const FONT_BODONI = '"Bodoni Moda", Georgia, serif'
const FONT_INTER  = '"Hanken Grotesk", Inter, system-ui, sans-serif'
```

with:

```ts
// ─── Design tokens (medisXime palette) ────────────────────────────────────────
const C = {
  gold: '#5C3A28', goldLight: '#9C4A2E',
  bg: '#FFFFFF', bgPanel: '#F5EDE1', bgSecondary: '#F5EDE1',
  white: '#FFFFFF', text: '#3D2B1F', textBrown: '#7A6452',
  textMedium: '#7A6452', textMuted: '#B0A08C',
  border: '#E6D9C7', borderLight: '#E6D9C7',
}
const FONT_BODONI = '"Cormorant Garamond", Georgia, serif'
const FONT_INTER  = 'Inter, sans-serif'
```

- [ ] **Step 2: Rename `DISCIPLINES` to `SPECIALTIES` and update the list of values**

Replace:

```ts
const DISCIPLINES = [
  'Pole Exotic', 'Pole Sport', 'Flexibilidad',
  'Core y Fuerza', 'Flow Principiante', 'Coreografía Sensual',
]
```

with:

```ts
const SPECIALTIES = [
  'Medicina General', 'Medicina Laboral', 'Medicina Bioreguladora',
  'SG-SST / Salud Ocupacional', 'Exámenes Médico Ocupacionales',
]
```

- [ ] **Step 3: Update `ID_TYPES`, add new constants, and widen `AccountRole`/`FormData`**

Replace:

```ts
const ID_TYPES = [
  'Cédula de Ciudadanía',
  'Cédula de Extranjería',
  'Pasaporte',
  'RUC',
]

const DEFAULT_AVATAR_URL = 'https://images.unsplash.com/photo-1518310383802-640c2de311b2?auto=format&fit=crop&q=80&w=600'

type AccountRole = 'USER' | 'PROFESSIONAL' | 'ADMIN'

interface FormData {
  firstName: string; lastName: string; idType: string; idNumber: string
  email: string; phone: string
  specialties: string[]; bio: string; instagramUrl: string
  password: string; confirmPassword: string
}
```

with:

```ts
const ID_TYPES = [
  'Cédula de Ciudadanía',
  'Cédula de Extranjería',
  'Tarjeta de Identidad',
  'Pasaporte',
]

const SECTORS = [
  'Manufactura', 'Construcción', 'Servicios', 'Comercio',
  'Salud', 'Educación', 'Transporte', 'Tecnología', 'Agroindustria', 'Otro',
]

const SERVICES_OF_INTEREST = [
  'Medicina Laboral', 'SG-SST', 'Exámenes Médico Ocupacionales', 'Medicina Bioreguladora',
]

const BLOOD_TYPES = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']

const DEFAULT_AVATAR_URL = 'https://images.unsplash.com/photo-1518310383802-640c2de311b2?auto=format&fit=crop&q=80&w=600'

type AccountRole = 'USER' | 'PROFESSIONAL' | 'EMPRESA' | 'ADMIN'

const ROLE_OPTIONS: { value: AccountRole; label: string }[] = [
  { value: 'USER', label: 'Pacientes' },
  { value: 'PROFESSIONAL', label: 'Personal Médico' },
  { value: 'EMPRESA', label: 'Empresas' },
  { value: 'ADMIN', label: 'Administrador' },
]

const ROLE_LABELS: Record<AccountRole, string> = {
  USER: 'Paciente',
  PROFESSIONAL: 'Personal Médico',
  EMPRESA: 'Empresa',
  ADMIN: 'Administrador',
}

interface FormData {
  firstName: string; lastName: string; idType: string; idNumber: string
  email: string; phone: string
  specialties: string[]; bio: string; instagramUrl: string
  professionalLicense: string
  eps: string; birthDate: string; bloodType: string
  nit: string; companySector: string; contactName: string; contactPosition: string
  interestedServices: string[]
  password: string; confirmPassword: string
}
```

- [ ] **Step 4: Initialize the new `FormData` fields in the initial form state**

Replace:

```ts
  const [form, setForm] = useState<FormData>({
    firstName: '', lastName: '', idType: ID_TYPES[0], idNumber: '',
    email: '', phone: '',
    specialties: [], bio: '', instagramUrl: '',
    password: '', confirmPassword: '',
  })
```

with:

```ts
  const [form, setForm] = useState<FormData>({
    firstName: '', lastName: '', idType: ID_TYPES[0], idNumber: '',
    email: '', phone: '',
    specialties: [], bio: '', instagramUrl: '',
    professionalLicense: '',
    eps: '', birthDate: '', bloodType: '',
    nit: '', companySector: SECTORS[0], contactName: '', contactPosition: '',
    interestedServices: [],
    password: '', confirmPassword: '',
  })
```

- [ ] **Step 5: Rename every remaining `DISCIPLINES` reference to `SPECIALTIES`**

Using a find-and-replace across the whole file, replace every occurrence of the
identifier:

```
DISCIPLINES
```

with:

```
SPECIALTIES
```

After Step 2, three occurrences remain: the two in `handleAddSpecialty` /
`handleDeleteSpecialty` (the `!DISCIPLINES.includes(trimmed)` and
`DISCIPLINES.includes(specialty)` checks), and one in the Step 3 specialty-chips JSX
(`[...DISCIPLINES.filter(d => !hiddenSpecialties.includes(d)), ...customSpecialties]`).
All three should become `SPECIALTIES`. (Task 14 will further edit that Step 3 block,
but by then it will already read `SPECIALTIES`.)

- [ ] **Step 6: Update `visibleSteps` — Step 3 ("Perfil") is hidden only for Administrador**

Replace:

```ts
  const visibleSteps = role === 'PROFESSIONAL' ? STEPS : STEPS.filter(s => s.n !== 3)
```

with:

```ts
  const visibleSteps = role === 'ADMIN' ? STEPS.filter(s => s.n !== 3) : STEPS
```

Pacientes (`USER`) and Empresas (`EMPRESA`) now also see Step 3 ("Perfil de Salud" /
"Servicios de interés", added in Task 14).

- [ ] **Step 7: Update `validate()` for the Empresa identity fields**

Replace:

```ts
  const validate = (s: number) => {
    const e: Record<string, string> = {}
    if (s === 1) {
      if (!form.firstName.trim())  e.firstName = 'Requerido'
      if (!form.lastName.trim())   e.lastName  = 'Requerido'
      if (!form.idNumber.trim())   e.idNumber  = 'Requerido'
    }
    if (s === 2) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email inválido'
      if (!form.phone.trim())  e.phone = 'Requerido'
    }
    if (s === 3) {
      if (role === 'PROFESSIONAL' && form.specialties.length === 0) e.specialties = 'Selecciona al menos una'
    }
    if (s === 4) {
      if (form.password.length < 8)              e.password     = 'Mínimo 8 caracteres'
      if (form.password !== form.confirmPassword) e.confirmPassword = 'No coinciden'
    }
    return e
  }
```

with:

```ts
  const validate = (s: number) => {
    const e: Record<string, string> = {}
    if (s === 1) {
      if (role === 'EMPRESA') {
        if (!form.firstName.trim()) e.firstName = 'Requerido'
        if (!form.nit.trim())       e.nit       = 'Requerido'
      } else {
        if (!form.firstName.trim())  e.firstName = 'Requerido'
        if (!form.lastName.trim())   e.lastName  = 'Requerido'
        if (!form.idNumber.trim())   e.idNumber  = 'Requerido'
      }
    }
    if (s === 2) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email inválido'
      if (!form.phone.trim())  e.phone = 'Requerido'
    }
    if (s === 3) {
      if (role === 'PROFESSIONAL' && form.specialties.length === 0) e.specialties = 'Selecciona al menos una'
    }
    if (s === 4) {
      if (form.password.length < 8)              e.password     = 'Mínimo 8 caracteres'
      if (form.password !== form.confirmPassword) e.confirmPassword = 'No coinciden'
    }
    return e
  }
```

- [ ] **Step 8: Commit**

```bash
git add medisxime-landing/src/components/admin/CreateProfessionalModal.tsx
git commit -m "feat(frontend): widen CreateProfessionalModal constants/types for 4 account types and medisXime palette"
```

---

## Task 12: CreateProfessionalModal.tsx — Paso 1 "Identidad" JSX

Updates the Step 1 ("Identidad") form per spec §3: Empresas show a single "Razón
Social" field instead of "Nombres"/"Apellidos", the "Tipo de cuenta" select now lists
the 4 medisXime account types via `ROLE_OPTIONS`, the "Tipo de Identificación"/"Número
de Identificación" fields are hidden for Empresas, and Empresas get new "NIT" and
"Sector económico" fields.

**Files:**
- Modify: `medisxime-landing/src/components/admin/CreateProfessionalModal.tsx:325-368` (Nombres/Apellidos + Tipo de cuenta)
- Modify: `medisxime-landing/src/components/admin/CreateProfessionalModal.tsx:395-426` (Tipo/Número ID + new NIT/Sector fields)

- [ ] **Step 1: Add the Razón Social branch and switch the role select to `ROLE_OPTIONS`**

Replace:

```tsx
            {/* PASO 1 — Identidad */}
            {step === 1 && (
              <div className="sp-step" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  {/* Nombres */}
                  <div>
                    <label style={LABEL}>Nombres <span style={{ color: '#ef4444' }}>*</span></label>
                    <input
                      type="text" value={form.firstName} placeholder="María"
                      onChange={e => { set('firstName', e.target.value); clearErr('firstName') }}
                      onFocus={e => (e.target.style.borderColor = C.gold)}
                      onBlur={e => (e.target.style.borderColor = errors.firstName ? '#ef4444' : C.border)}
                      style={INPUT(errors.firstName)}
                    />
                    {errors.firstName && <p style={ERR}>{errors.firstName}</p>}
                  </div>
                  {/* Apellidos */}
                  <div>
                    <label style={LABEL}>Apellidos <span style={{ color: '#ef4444' }}>*</span></label>
                    <input
                      type="text" value={form.lastName} placeholder="González"
                      onChange={e => { set('lastName', e.target.value); clearErr('lastName') }}
                      onFocus={e => (e.target.style.borderColor = C.gold)}
                      onBlur={e => (e.target.style.borderColor = errors.lastName ? '#ef4444' : C.border)}
                      style={INPUT(errors.lastName)}
                    />
                    {errors.lastName && <p style={ERR}>{errors.lastName}</p>}
                  </div>
                </div>

                <div>
                  <label style={LABEL}>Tipo de cuenta <span style={{ color: '#ef4444' }}>*</span></label>
                  <select
                    value={role}
                    onChange={e => { setRole(e.target.value as AccountRole); setProfType('dependiente') }}
                    onFocus={e => (e.target.style.borderColor = C.gold)}
                    onBlur={e => (e.target.style.borderColor = C.border)}
                    style={{ ...INPUT(), cursor: 'pointer', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237F7665' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', paddingRight: 36 }}
                  >
                    <option value="PROFESSIONAL">Profesional</option>
                    <option value="USER">Usuario normal</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>
```

with:

```tsx
            {/* PASO 1 — Identidad */}
            {step === 1 && (
              <div className="sp-step" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {role === 'EMPRESA' ? (
                  <div>
                    <label style={LABEL}>Razón Social <span style={{ color: '#ef4444' }}>*</span></label>
                    <input
                      type="text" value={form.firstName} placeholder="Acme S.A.S."
                      onChange={e => { set('firstName', e.target.value); clearErr('firstName') }}
                      onFocus={e => (e.target.style.borderColor = C.gold)}
                      onBlur={e => (e.target.style.borderColor = errors.firstName ? '#ef4444' : C.border)}
                      style={INPUT(errors.firstName)}
                    />
                    {errors.firstName && <p style={ERR}>{errors.firstName}</p>}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    {/* Nombres */}
                    <div>
                      <label style={LABEL}>Nombres <span style={{ color: '#ef4444' }}>*</span></label>
                      <input
                        type="text" value={form.firstName} placeholder="María"
                        onChange={e => { set('firstName', e.target.value); clearErr('firstName') }}
                        onFocus={e => (e.target.style.borderColor = C.gold)}
                        onBlur={e => (e.target.style.borderColor = errors.firstName ? '#ef4444' : C.border)}
                        style={INPUT(errors.firstName)}
                      />
                      {errors.firstName && <p style={ERR}>{errors.firstName}</p>}
                    </div>
                    {/* Apellidos */}
                    <div>
                      <label style={LABEL}>Apellidos <span style={{ color: '#ef4444' }}>*</span></label>
                      <input
                        type="text" value={form.lastName} placeholder="González"
                        onChange={e => { set('lastName', e.target.value); clearErr('lastName') }}
                        onFocus={e => (e.target.style.borderColor = C.gold)}
                        onBlur={e => (e.target.style.borderColor = errors.lastName ? '#ef4444' : C.border)}
                        style={INPUT(errors.lastName)}
                      />
                      {errors.lastName && <p style={ERR}>{errors.lastName}</p>}
                    </div>
                  </div>
                )}

                <div>
                  <label style={LABEL}>Tipo de cuenta <span style={{ color: '#ef4444' }}>*</span></label>
                  <select
                    value={role}
                    onChange={e => { setRole(e.target.value as AccountRole); setProfType('dependiente') }}
                    onFocus={e => (e.target.style.borderColor = C.gold)}
                    onBlur={e => (e.target.style.borderColor = C.border)}
                    style={{ ...INPUT(), cursor: 'pointer', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237F7665' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', paddingRight: 36 }}
                  >
                    {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
```

- [ ] **Step 2: Hide Tipo/Número de Identificación for Empresas and add NIT/Sector fields**

Replace:

```tsx
                {/* Tipo ID */}
                <div>
                  <label style={LABEL}>Tipo de Identificación</label>
                  <select
                    value={form.idType}
                    onChange={e => set('idType', e.target.value)}
                    onFocus={e => (e.target.style.borderColor = C.gold)}
                    onBlur={e => (e.target.style.borderColor = C.border)}
                    style={{
                      ...INPUT(), cursor: 'pointer', appearance: 'none',
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237F7665' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', paddingRight: 36,
                    }}
                  >
                    {ID_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                {/* Número ID */}
                <div>
                  <label style={LABEL}>Número de Identificación <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    type="text" value={form.idNumber} placeholder="1720456789"
                    onChange={e => { set('idNumber', e.target.value); clearErr('idNumber') }}
                    onFocus={e => (e.target.style.borderColor = C.gold)}
                    onBlur={e => (e.target.style.borderColor = errors.idNumber ? '#ef4444' : C.border)}
                    style={INPUT(errors.idNumber)}
                  />
                  {errors.idNumber && <p style={ERR}>{errors.idNumber}</p>}
                </div>
              </div>
            )}
```

with:

```tsx
                {/* Tipo ID + Número ID — no aplica para Empresas */}
                {role !== 'EMPRESA' && (
                  <>
                    <div>
                      <label style={LABEL}>Tipo de Identificación</label>
                      <select
                        value={form.idType}
                        onChange={e => set('idType', e.target.value)}
                        onFocus={e => (e.target.style.borderColor = C.gold)}
                        onBlur={e => (e.target.style.borderColor = C.border)}
                        style={{
                          ...INPUT(), cursor: 'pointer', appearance: 'none',
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237F7665' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                          backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', paddingRight: 36,
                        }}
                      >
                        {ID_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>

                    <div>
                      <label style={LABEL}>Número de Identificación <span style={{ color: '#ef4444' }}>*</span></label>
                      <input
                        type="text" value={form.idNumber} placeholder="1720456789"
                        onChange={e => { set('idNumber', e.target.value); clearErr('idNumber') }}
                        onFocus={e => (e.target.style.borderColor = C.gold)}
                        onBlur={e => (e.target.style.borderColor = errors.idNumber ? '#ef4444' : C.border)}
                        style={INPUT(errors.idNumber)}
                      />
                      {errors.idNumber && <p style={ERR}>{errors.idNumber}</p>}
                    </div>
                  </>
                )}

                {/* NIT + Sector — solo para Empresas */}
                {role === 'EMPRESA' && (
                  <>
                    <div>
                      <label style={LABEL}>NIT <span style={{ color: '#ef4444' }}>*</span></label>
                      <input
                        type="text" value={form.nit} placeholder="900123456-7"
                        onChange={e => { set('nit', e.target.value); clearErr('nit') }}
                        onFocus={e => (e.target.style.borderColor = C.gold)}
                        onBlur={e => (e.target.style.borderColor = errors.nit ? '#ef4444' : C.border)}
                        style={INPUT(errors.nit)}
                      />
                      {errors.nit && <p style={ERR}>{errors.nit}</p>}
                    </div>

                    <div>
                      <label style={LABEL}>Sector económico</label>
                      <select
                        value={form.companySector}
                        onChange={e => set('companySector', e.target.value)}
                        onFocus={e => (e.target.style.borderColor = C.gold)}
                        onBlur={e => (e.target.style.borderColor = C.border)}
                        style={{
                          ...INPUT(), cursor: 'pointer', appearance: 'none',
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237F7665' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                          backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', paddingRight: 36,
                        }}
                      >
                        {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </>
                )}
              </div>
            )}
```

- [ ] **Step 3: Commit**

```bash
git add medisxime-landing/src/components/admin/CreateProfessionalModal.tsx
git commit -m "feat(frontend): redesign CreateProfessionalModal Paso 1 (Identidad) for 4 account types"
```

---

## Task 13: CreateProfessionalModal.tsx — Paso 2 "Contacto" JSX

Adds the Empresa-only "Nombre del contacto" and "Cargo del contacto" fields after the
"Foto de Perfil" block, per spec §3 (Paso 2 table). Email, Teléfono and Foto stay
unchanged and apply to all 4 roles.

**Files:**
- Modify: `medisxime-landing/src/components/admin/CreateProfessionalModal.tsx:463-477` (end of Paso 2)

- [ ] **Step 1: Add the Empresa contact fields after "Foto de Perfil"**

Replace:

```tsx
                {/* Foto */}
                <div>
                  <label style={LABEL}>Foto de Perfil</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px', background: C.bgPanel, border: `1.5px solid ${C.borderLight}`, borderRadius: 12 }}>
                    <img src={DEFAULT_AVATAR_URL} alt="avatar por defecto" style={{ width: 80, height: 80, borderRadius: 10, objectFit: 'cover', border: `2px solid ${C.goldLight}` }} />
                    <div style={{ fontFamily: FONT_INTER, fontSize: 12, color: C.textBrown, lineHeight: 1.6 }}>
                      La cuenta se crea con una imagen por defecto.
                      <br />
                      La foto personalizada se puede editar después.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PASO 3 — Perfil Profesional */}
```

with:

```tsx
                {/* Foto */}
                <div>
                  <label style={LABEL}>Foto de Perfil</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px', background: C.bgPanel, border: `1.5px solid ${C.borderLight}`, borderRadius: 12 }}>
                    <img src={DEFAULT_AVATAR_URL} alt="avatar por defecto" style={{ width: 80, height: 80, borderRadius: 10, objectFit: 'cover', border: `2px solid ${C.goldLight}` }} />
                    <div style={{ fontFamily: FONT_INTER, fontSize: 12, color: C.textBrown, lineHeight: 1.6 }}>
                      La cuenta se crea con una imagen por defecto.
                      <br />
                      La foto personalizada se puede editar después.
                    </div>
                  </div>
                </div>

                {/* Contacto — solo para Empresas */}
                {role === 'EMPRESA' && (
                  <>
                    <div>
                      <label style={LABEL}>Nombre del contacto</label>
                      <input
                        type="text" value={form.contactName} placeholder="Nombre de la persona de contacto"
                        onChange={e => set('contactName', e.target.value)}
                        onFocus={e => (e.target.style.borderColor = C.gold)}
                        onBlur={e => (e.target.style.borderColor = C.border)}
                        style={INPUT()}
                      />
                    </div>

                    <div>
                      <label style={LABEL}>Cargo del contacto</label>
                      <input
                        type="text" value={form.contactPosition} placeholder="Ej: Gerente de Recursos Humanos"
                        onChange={e => set('contactPosition', e.target.value)}
                        onFocus={e => (e.target.style.borderColor = C.gold)}
                        onBlur={e => (e.target.style.borderColor = C.border)}
                        style={INPUT()}
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* PASO 3 — Perfil Profesional */}
```

- [ ] **Step 2: Commit**

```bash
git add medisxime-landing/src/components/admin/CreateProfessionalModal.tsx
git commit -m "feat(frontend): add Empresa contact fields to CreateProfessionalModal Paso 2 (Contacto)"
```

---

## Task 14: CreateProfessionalModal.tsx — Paso 3 "Perfil" JSX

Implements spec §3 (Paso 3 table) for the remaining 3 roles: Personal Médico gets a
new "Registro Médico / Tarjeta Profesional" input after "Especialidades"; Pacientes
get a new "Perfil de Salud" section (EPS, Fecha de nacimiento, Tipo de sangre);
Empresas get a new "Servicios de interés" checkbox list. Administrador has no Paso 3
(already excluded from `visibleSteps` by Task 11 Step 6).

**Files:**
- Modify: `medisxime-landing/src/components/admin/CreateProfessionalModal.tsx:543-548` (Personal Médico — Especialidades/Bio boundary)
- Modify: `medisxime-landing/src/components/admin/CreateProfessionalModal.tsx:644-649` (end of Paso 3, before Paso 4)

- [ ] **Step 1: Add "Registro Médico / Tarjeta Profesional" to the Personal Médico branch**

Replace:

```tsx
                  </AnimatePresence>
                  {errors.specialties && <p style={ERR}>{errors.specialties}</p>}
                </div>

                {/* Bio */}
                <div>
                  <label style={LABEL}>Biografía</label>
```

with:

```tsx
                  </AnimatePresence>
                  {errors.specialties && <p style={ERR}>{errors.specialties}</p>}
                </div>

                {/* Registro Médico / Tarjeta Profesional */}
                <div>
                  <label style={LABEL}>Registro Médico / Tarjeta Profesional</label>
                  <input
                    type="text" value={form.professionalLicense} placeholder="Número de tarjeta profesional o registro médico"
                    onChange={e => set('professionalLicense', e.target.value)}
                    onFocus={e => (e.target.style.borderColor = C.gold)}
                    onBlur={e => (e.target.style.borderColor = C.border)}
                    style={INPUT()}
                  />
                </div>

                {/* Bio */}
                <div>
                  <label style={LABEL}>Biografía</label>
```

- [ ] **Step 2: Add "Perfil de Salud" (Pacientes) and "Servicios de interés" (Empresas) as sibling Paso 3 blocks**

Replace:

```tsx
                  </div>
                )}
              </div>
            )}

            {/* PASO 4 — Acceso */}
```

with:

```tsx
                  </div>
                )}
              </div>
            )}

            {/* PASO 3 — Perfil de Salud (Pacientes) */}
            {step === 3 && role === 'USER' && (
              <div className="sp-step" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ padding: '12px 14px', border: `1px solid ${C.borderLight}`, background: C.bgPanel, borderRadius: 12, color: C.textBrown, fontFamily: FONT_INTER, fontSize: 12, lineHeight: 1.6 }}>
                  Información de salud del paciente. Todos los campos son opcionales.
                </div>

                <div>
                  <label style={LABEL}>EPS / Seguro médico</label>
                  <input
                    type="text" value={form.eps} placeholder="Nombre de la EPS o seguro médico"
                    onChange={e => set('eps', e.target.value)}
                    onFocus={e => (e.target.style.borderColor = C.gold)}
                    onBlur={e => (e.target.style.borderColor = C.border)}
                    style={INPUT()}
                  />
                </div>

                <div>
                  <label style={LABEL}>Fecha de nacimiento</label>
                  <input
                    type="date" value={form.birthDate}
                    onChange={e => set('birthDate', e.target.value)}
                    onFocus={e => (e.target.style.borderColor = C.gold)}
                    onBlur={e => (e.target.style.borderColor = C.border)}
                    style={INPUT()}
                  />
                </div>

                <div>
                  <label style={LABEL}>Tipo de sangre</label>
                  <select
                    value={form.bloodType}
                    onChange={e => set('bloodType', e.target.value)}
                    onFocus={e => (e.target.style.borderColor = C.gold)}
                    onBlur={e => (e.target.style.borderColor = C.border)}
                    style={INPUT()}
                  >
                    <option value="">Seleccionar...</option>
                    {BLOOD_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* PASO 3 — Servicios de interés (Empresas) */}
            {step === 3 && role === 'EMPRESA' && (
              <div className="sp-step" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ padding: '12px 14px', border: `1px solid ${C.borderLight}`, background: C.bgPanel, borderRadius: 12, color: C.textBrown, fontFamily: FONT_INTER, fontSize: 12, lineHeight: 1.6 }}>
                  Selecciona los servicios que son de interés para tu empresa.
                </div>

                <div>
                  <label style={LABEL}>Servicios de interés</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {SERVICES_OF_INTEREST.map(s => {
                      const on = form.interestedServices.includes(s)
                      return (
                        <label key={s}
                          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${on ? C.gold : C.border}`, background: on ? 'rgba(139,92,246,0.06)' : 'transparent', cursor: 'pointer', fontFamily: FONT_INTER, fontSize: 13, fontWeight: 600, color: on ? C.gold : C.textBrown, transition: 'all 0.15s ease' }}
                        >
                          <input
                            type="checkbox" checked={on}
                            onChange={() => setForm(f => ({ ...f, interestedServices: on ? f.interestedServices.filter(x => x !== s) : [...f.interestedServices, s] }))}
                            style={{ width: 16, height: 16, accentColor: C.gold, cursor: 'pointer' }}
                          />
                          {s}
                        </label>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* PASO 4 — Acceso */}
```

- [ ] **Step 3: Commit**

```bash
git add medisxime-landing/src/components/admin/CreateProfessionalModal.tsx
git commit -m "feat(frontend): add role-specific Paso 3 sections (Registro Médico, Perfil de Salud, Servicios de interés)"
```

---

## Task 15: CreateProfessionalModal.tsx — Paso 4 "Acceso" + `submit()` + footer

Wires up the new fields end-to-end: `submit()` sends all 11 new optional fields to
`POST /api/professionals` (with `lastName: ''` for Empresas, per spec §2), the resume
card on Paso 4 shows "Razón Social"/NIT/servicios de interés for Empresas instead of
nombres+especialidades, and the submit button label becomes role-aware via
`ROLE_LABELS`.

**Files:**
- Modify: `medisxime-landing/src/components/admin/CreateProfessionalModal.tsx:208-220` (`submit()` payload)
- Modify: `medisxime-landing/src/components/admin/CreateProfessionalModal.tsx:652-668` (Paso 4 resume card)
- Modify: `medisxime-landing/src/components/admin/CreateProfessionalModal.tsx:772` (footer submit button label)

- [ ] **Step 1: Extend the `submit()` payload with the 11 new optional fields**

Replace:

```tsx
        body: JSON.stringify({
          email:            form.email.toLowerCase().trim(),
          password:         form.password,
          role,
          firstName:        form.firstName.trim(),
          lastName:         form.lastName.trim(),
          phone:            form.phone.trim()        || undefined,
          avatarUrl:        DEFAULT_AVATAR_URL,
          bio:              form.bio.trim()          || undefined,
          specialties:      form.specialties.length ? form.specialties : undefined,
          instagramUrl:     form.instagramUrl.trim() || undefined,
          professionalType: role === 'PROFESSIONAL' ? professionalType : undefined,
        }),
```

with:

```tsx
        body: JSON.stringify({
          email:               form.email.toLowerCase().trim(),
          password:            form.password,
          role,
          firstName:           form.firstName.trim(),
          lastName:            role === 'EMPRESA' ? '' : form.lastName.trim(),
          phone:               form.phone.trim()        || undefined,
          avatarUrl:           DEFAULT_AVATAR_URL,
          bio:                 form.bio.trim()          || undefined,
          specialties:         form.specialties.length ? form.specialties : undefined,
          instagramUrl:        form.instagramUrl.trim() || undefined,
          professionalType:    role === 'PROFESSIONAL' ? professionalType : undefined,
          idType:              form.idNumber.trim() ? form.idType : undefined,
          idNumber:            form.idNumber.trim()         || undefined,
          professionalLicense: form.professionalLicense.trim() || undefined,
          eps:                 form.eps.trim()               || undefined,
          birthDate:           form.birthDate                || undefined,
          bloodType:           form.bloodType                || undefined,
          nit:                 form.nit.trim()               || undefined,
          companySector:       role === 'EMPRESA' ? form.companySector : undefined,
          contactName:         form.contactName.trim()       || undefined,
          contactPosition:     form.contactPosition.trim()   || undefined,
          interestedServices:  form.interestedServices.length ? form.interestedServices : undefined,
        }),
```

- [ ] **Step 2: Make the Paso 4 resume card role-aware**

Replace:

```tsx
                {/* Resumen */}
                <div style={{ background: C.bgPanel, border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <img src={DEFAULT_AVATAR_URL} style={{ width: 50, height: 50, borderRadius: 9, objectFit: 'cover', flexShrink: 0, border: `2px solid ${C.goldLight}` }} alt="avatar por defecto" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: FONT_BODONI, fontSize: 16, fontWeight: 600, color: C.text, margin: '0 0 2px' }}>
                      {form.firstName} {form.lastName}
                    </p>
                    {role === 'PROFESSIONAL' && (
                      <p style={{ fontFamily: FONT_INTER, fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 5px' }}>
                        {form.specialties.join(' · ') || 'Sin especialidades'}
                      </p>
                    )}
                    <div style={{ fontFamily: FONT_INTER, fontSize: 11, color: C.textMedium }}>
                      {form.email} · {form.phone}
                    </div>
                  </div>
                </div>
```

with:

```tsx
                {/* Resumen */}
                <div style={{ background: C.bgPanel, border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <img src={DEFAULT_AVATAR_URL} style={{ width: 50, height: 50, borderRadius: 9, objectFit: 'cover', flexShrink: 0, border: `2px solid ${C.goldLight}` }} alt="avatar por defecto" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: FONT_BODONI, fontSize: 16, fontWeight: 600, color: C.text, margin: '0 0 2px' }}>
                      {role === 'EMPRESA' ? form.firstName : `${form.firstName} ${form.lastName}`}
                    </p>
                    {role === 'PROFESSIONAL' && (
                      <p style={{ fontFamily: FONT_INTER, fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 5px' }}>
                        {form.specialties.join(' · ') || 'Sin especialidades'}
                      </p>
                    )}
                    {role === 'EMPRESA' && (
                      <p style={{ fontFamily: FONT_INTER, fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 5px' }}>
                        NIT: {form.nit || 'Sin NIT'} · {form.interestedServices.join(' · ') || 'Sin servicios de interés'}
                      </p>
                    )}
                    <div style={{ fontFamily: FONT_INTER, fontSize: 11, color: C.textMedium }}>
                      {form.email} · {form.phone}
                    </div>
                  </div>
                </div>
```

- [ ] **Step 3: Make the submit button label role-aware**

Replace:

```tsx
                  {loading
                    ? <><span style={{ width: 14, height: 14, border: `2px solid rgba(255,255,255,0.4)`, borderTopColor: C.white, borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /> Creando...</>
                    : <><Check size={14} strokeWidth={2.5} /> Crear Profesional</>
                  }
```

with:

```tsx
                  {loading
                    ? <><span style={{ width: 14, height: 14, border: `2px solid rgba(255,255,255,0.4)`, borderTopColor: C.white, borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /> Creando...</>
                    : <><Check size={14} strokeWidth={2.5} /> Crear {ROLE_LABELS[role]}</>
                  }
```

- [ ] **Step 4: Commit**

```bash
git add medisxime-landing/src/components/admin/CreateProfessionalModal.tsx
git commit -m "feat(frontend): wire up new account-type fields in CreateProfessionalModal submit, resume card and footer"
```

---

## Task 16: CreateProfessionalModal.tsx — replace remaining literal purple `rgba(139,92,246,*)` overlays

After Tasks 11-15, every `C.*`-referenced color has been migrated to the medisXime
palette, but 9 literal `rgba(139,92,246,<alpha>)` strings remain — these are the old
medisxime purple (`#8B5CF6`) baked directly into chip backgrounds, icon-button
backgrounds, the schedule "add slot" panel/time badge, and the two CTA button
shadows (Continuar / Crear), plus the new Empresa "Servicios de interés" checkbox
background added in Task 14. `139,92,246` is the RGB triplet for `#8B5CF6`;
`92,58,40` is the RGB triplet for the medisXime brand-gold `C.gold` (`#5C3A28`).
Because the triplet is shared across all `rgba(139,92,246,<alpha>)` calls regardless
of their opacity suffix, a single substring `replace_all` converts every one of them
in a single pass — no individual edits needed.

**Files:**
- Modify: `medisxime-landing/src/components/admin/CreateProfessionalModal.tsx` (global)

- [ ] **Step 1: Verify the current count of `139,92,246` occurrences**

Run: `grep -c "139,92,246" medisxime-landing/src/components/admin/CreateProfessionalModal.tsx`
Expected: `9`

- [ ] **Step 2: Replace every `139,92,246` with `92,58,40`**

Using the Edit tool with `replace_all: true` on
`medisxime-landing/src/components/admin/CreateProfessionalModal.tsx`:

- `old_string`: `139,92,246`
- `new_string`: `92,58,40`

- [ ] **Step 3: Verify the substitution**

Run: `grep -c "139,92,246" medisxime-landing/src/components/admin/CreateProfessionalModal.tsx`
Expected: `0` (grep exits non-zero on no matches, which is fine)

Run: `grep -c "92,58,40" medisxime-landing/src/components/admin/CreateProfessionalModal.tsx`
Expected: `9`

- [ ] **Step 4: Commit**

```bash
git add medisxime-landing/src/components/admin/CreateProfessionalModal.tsx
git commit -m "feat(frontend): replace remaining literal purple overlays with medisXime gold in CreateProfessionalModal"
```

---

## Task 17: Frontend type-check and manual verification of the 4-role wizard

**Files:** none (verification only)

- [ ] **Step 1: Run the frontend type-check**

Run: `pnpm --filter medisxime-landing exec tsc -b`

Expected: no output, exit code 0. This confirms `FormData`, `ROLE_OPTIONS`,
`ROLE_LABELS`, `SECTORS`, `SERVICES_OF_INTEREST`, `BLOOD_TYPES`, the widened
`AccountRole`, and the `UserType`/`ROLE_CONFIG` changes from Tasks 7-8 all compile
together.

- [ ] **Step 2: Start the backend and frontend dev servers**

Run in two separate terminals:

```bash
pnpm --filter @medisxime/backend dev
```

```bash
pnpm --filter medisxime-landing dev
```

- [ ] **Step 3: Manually walk through "Nueva Cuenta" for each of the 4 roles**

In the browser, log in as an admin, open the Usuarios dashboard, and click
"Nueva Cuenta" (`CreateProfessionalModal`). For each role in the "Tipo de cuenta"
select (Paso 1), verify:

- **Pacientes** (`USER`): Paso 1 shows Nombres/Apellidos + Tipo de Identificación/
  Número de Identificación. Paso 3 shows "Perfil de Salud" with EPS, Fecha de
  nacimiento and Tipo de sangre (all optional — can submit blank). Footer button
  reads "Crear Paciente".
- **Personal Médico** (`PROFESSIONAL`): Paso 1 shows Nombres/Apellidos + Tipo/Número
  de Identificación + tipo profesional toggle (dependiente/independiente). Paso 3
  shows the especialidad chips (from `SPECIALTIES`), the new "Registro Médico /
  Tarjeta Profesional" input, Biografía, Instagram, and — if "independiente" is
  selected — the Horario disponible section. Footer button reads "Crear Personal
  Médico".
- **Empresas** (`EMPRESA`): Paso 1 shows a single "Razón Social" input (no
  Nombres/Apellidos, no Tipo/Número de Identificación) plus "NIT" and "Sector
  económico". Paso 2 shows the extra "Nombre del contacto"/"Cargo del contacto"
  fields after "Foto de Perfil". Paso 3 shows "Servicios de interés" checkboxes
  (from `SERVICES_OF_INTEREST`). The Paso 4 resume card shows the Razón Social, NIT
  and selected servicios de interés instead of nombres+especialidades. Footer button
  reads "Crear Empresa". Complete this wizard end-to-end for at least one test
  account (fill Razón Social, NIT, email, password) and confirm the request
  succeeds.
- **Administrador** (`ADMIN`): the wizard has only 3 steps (Paso 3 "Perfil" is
  skipped — step counter goes 1/4 → 2/4 → 4/4, i.e. "Identidad" → "Contacto" →
  "Acceso"). Footer button reads "Crear Administrador".

- [ ] **Step 4: Verify UsuariosDashboard branding and role filters**

- Confirm the sidebar shows the "XC" / "MedisXime" / "Consultorio Admin" branding in
  the medisXime café/crema/terracota palette (no purple `#8B5CF6`/blue `#3B82F6`
  remnants anywhere on the page).
- Confirm the role filter pills read: Todos, Pacientes, Personal Médico, Empresas,
  Administrador.
- Select the "Empresas" pill and confirm only the EMPRESA account(s) created in
  Step 3 are shown — this verifies the `ROLE_FILTER_MAP` fix in `matchRole`.
- Open the card for the EMPRESA account created in Step 3 and confirm its
  "Documento" field shows the NIT.
- Confirm the dashboard footer reads "© 2026 MedisXime · Todos los derechos
  reservados".

If any step fails, fix the underlying task before considering the plan complete —
do not patch around it in Task 17.

---
