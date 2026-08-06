-- ============================================================
-- Migration 027: integridad referencial y auditoría del catálogo CUPS
-- ============================================================
-- - cups_catalog / service_classification_cups_map ganan is_active:
--   en vez de borrar un código/mapeo en uso, se marca inactivo (deja
--   de ofrecerse en el autocompletado del formulario de servicios,
--   pero no rompe nada de lo ya guardado).
-- - cups_audit_log registra toda creación/modificación/inactivación/
--   reactivación/eliminación sobre ambas tablas, con quién y cuándo.
-- ============================================================

ALTER TABLE cups_catalog ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE service_classification_cups_map ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS cups_audit_log (
  id                 BIGSERIAL PRIMARY KEY,
  entity_type        VARCHAR(20) NOT NULL,   -- 'catalog' | 'mapping'
  entity_ref         VARCHAR(255) NOT NULL,  -- cups_code (catalog) o id (mapping)
  action             VARCHAR(20) NOT NULL,   -- 'create' | 'update' | 'deactivate' | 'reactivate' | 'delete'
  performed_by_id    UUID,
  performed_by_email VARCHAR(255),
  details            JSONB,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cups_audit_log_entity ON cups_audit_log (entity_type, entity_ref);
CREATE INDEX IF NOT EXISTS idx_cups_audit_log_created_at ON cups_audit_log (created_at DESC);
