-- ============================================================
-- Migration 026: soporte para administrar el catálogo CUPS y sus
-- mapeos desde el panel Admin (en vez de solo por migración SQL).
-- ============================================================
-- service_classification_cups_map pasa a tener un id propio para
-- poder identificar y borrar una fila individual desde la UI; se
-- conserva la restricción de unicidad (specialty + clasificación +
-- cups_code) para no permitir mapeos duplicados.
-- ============================================================

ALTER TABLE service_classification_cups_map ADD COLUMN IF NOT EXISTS id BIGSERIAL;

ALTER TABLE service_classification_cups_map DROP CONSTRAINT IF EXISTS service_classification_cups_map_pkey;
ALTER TABLE service_classification_cups_map ADD PRIMARY KEY (id);

ALTER TABLE service_classification_cups_map DROP CONSTRAINT IF EXISTS service_classification_cups_map_unique;
ALTER TABLE service_classification_cups_map
  ADD CONSTRAINT service_classification_cups_map_unique
  UNIQUE (specialty, service_group, service_subgroup, service_category, service_subcategory, cups_code);
