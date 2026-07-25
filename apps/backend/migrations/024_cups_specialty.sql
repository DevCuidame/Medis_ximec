-- ============================================================
-- Migration 024: La especialidad (Categoría principal) pasa a
-- ser parte del criterio de búsqueda del CUPS.
-- ============================================================
-- Antes, el mapeo dependía solo de Grupo/Subgrupo/Categoría/
-- Subcategoría, así que dos servicios con la misma clasificación
-- de habilitación pero distinta especialidad (ej. Medicina General
-- vs. Medicina Laboral) recibían el mismo CUPS por error. Ahora la
-- especialidad (mismo texto que "Categoría principal" del
-- formulario / columna service_offers.specialty) es parte de la
-- clave de búsqueda.
-- ============================================================

ALTER TABLE service_classification_cups_map ADD COLUMN IF NOT EXISTS specialty VARCHAR(100);

-- Los mapeos ya sembrados (consultas genéricas de medicina general
-- y psicología) no corresponden a ninguna de las especialidades
-- propias de la clínica (Medicina Bioreguladora, Exámenes Médico
-- Ocupacionales, Medicina Laboral, Consultoría en SG-SST, Salud en
-- el Trabajo); se etiquetan como "Otros" en vez de inventar una
-- especialidad específica que no se puede verificar.
UPDATE service_classification_cups_map SET specialty = 'Otros' WHERE specialty IS NULL;

ALTER TABLE service_classification_cups_map ALTER COLUMN specialty SET NOT NULL;

ALTER TABLE service_classification_cups_map DROP CONSTRAINT IF EXISTS service_classification_cups_map_pkey;
ALTER TABLE service_classification_cups_map
  ADD PRIMARY KEY (specialty, service_group, service_subgroup, service_category, service_subcategory, cups_code);

DROP INDEX IF EXISTS idx_classification_cups_map_lookup;
CREATE INDEX IF NOT EXISTS idx_classification_cups_map_lookup
  ON service_classification_cups_map (specialty, service_group, service_subgroup, service_category, service_subcategory);
