-- ============================================================
-- Migration 023: Catálogo oficial de CUPS y mapeo de clasificación
-- ============================================================
-- cups_catalog: procedimientos oficiales (código + nombre), tomados
-- del catálogo público del Ministerio de Salud "Procedimiento del PBS"
-- (datos.gov.co, dataset 9zcz-bjue).
--
-- service_classification_cups_map: relaciona la clasificación de
-- habilitación del servicio (grupo/subgrupo/categoría/subcategoría,
-- ver medisxime-landing/src/lib/serviciosCatalogo.ts) con uno o más
-- procedimientos CUPS candidatos. Una clasificación con un solo
-- candidato se autocompleta; con más de uno, el administrador debe
-- elegir el procedimiento específico; sin candidatos, el servicio no
-- puede guardarse hasta que un administrador configure el mapeo aquí.
-- ============================================================

CREATE TABLE IF NOT EXISTS cups_catalog (
  cups_code       VARCHAR(10) PRIMARY KEY,
  procedure_name  VARCHAR(255) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS service_classification_cups_map (
  specialty            VARCHAR(100) NOT NULL,
  service_group        VARCHAR(10) NOT NULL,
  service_subgroup     VARCHAR(10) NOT NULL,
  service_category     VARCHAR(10) NOT NULL,
  service_subcategory  VARCHAR(10) NOT NULL,
  cups_code            VARCHAR(10) NOT NULL REFERENCES cups_catalog(cups_code),
  PRIMARY KEY (specialty, service_group, service_subgroup, service_category, service_subcategory, cups_code)
);

CREATE INDEX IF NOT EXISTS idx_classification_cups_map_lookup
  ON service_classification_cups_map (specialty, service_group, service_subgroup, service_category, service_subcategory);

-- Solo se siembran códigos con correspondencia oficial verificable.
-- El resto de clasificaciones queda sin mapear a propósito: deben
-- configurarse manualmente antes de poder guardar un servicio con
-- esa clasificación.
INSERT INTO cups_catalog (cups_code, procedure_name) VALUES
  ('890201', 'Consulta de primera vez por medicina general'),
  ('890301', 'Consulta de control o de seguimiento por medicina general'),
  ('890208', 'Consulta de primera vez por psicología'),
  ('890308', 'Consulta de control o de seguimiento por psicología')
ON CONFLICT (cups_code) DO NOTHING;

-- 01 Consulta externa → 0101 Medicina general → 010101 Consulta primera vez → 01010101 Presencial: único candidato.
-- "Medicina general" no es una especialidad seleccionable en "Categoría principal", se etiqueta "Otros".
INSERT INTO service_classification_cups_map (specialty, service_group, service_subgroup, service_category, service_subcategory, cups_code)
VALUES ('Otros', '01', '0101', '010101', '01010101', '890201')
ON CONFLICT DO NOTHING;

-- 01 Consulta externa → 0101 Medicina general → 010102 Consulta de control → 01010201 Presencial: único candidato.
INSERT INTO service_classification_cups_map (specialty, service_group, service_subgroup, service_category, service_subcategory, cups_code)
VALUES ('Otros', '01', '0101', '010102', '01010201', '890301')
ON CONFLICT DO NOTHING;

-- 01 Consulta externa → 0104 Psicología y terapias → 010401 Psicología → 01040199 Otras:
-- esta subcategoría no distingue primera vez/control, por lo que hay dos candidatos oficiales.
INSERT INTO service_classification_cups_map (specialty, service_group, service_subgroup, service_category, service_subcategory, cups_code)
VALUES
  ('Psicología', '01', '0104', '010401', '01040199', '890208'),
  ('Psicología', '01', '0104', '010401', '01040199', '890308')
ON CONFLICT DO NOTHING;
