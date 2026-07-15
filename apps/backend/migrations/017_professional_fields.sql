-- ============================================================
-- Migration 017: Professional fields (nombres separados,
-- dirección, credenciales SISPRO)
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS second_name         VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS second_last_name    VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS address             VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS sispro_user         VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS sispro_password_enc TEXT;
