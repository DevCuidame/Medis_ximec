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
