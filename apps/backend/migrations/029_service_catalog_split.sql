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
