-- ============================================================
-- Migration 018: Código de Prestador (REPS) en sedes
-- ============================================================

ALTER TABLE locations ADD COLUMN IF NOT EXISTS provider_code VARCHAR(20);
