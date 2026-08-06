-- ============================================================
-- Migration 025: CUPS oficiales para las especialidades del
-- consultorio (Medicina Laboral, Ginecología, Medicina Familiar,
-- Psicología, Nutrición, Salud en el Trabajo). Consultoría en
-- SG-SST y los exámenes médico ocupacionales (ingreso/periódico/
-- egreso/reintegro) NO tienen CUPS oficial y quedan
-- deliberadamente sin mapear.
--
-- Medicina Bioreguladora también queda deliberadamente SIN MAPEAR:
-- no existe un CUPS con ese nombre, y la única equivalencia
-- candidata investigada ("medicina alternativa homeopática",
-- 64435/64532) resultó tener respaldo legal insuficiente al
-- verificarla contra el texto primario (la Ley 1164 de 2007, citada
-- inicialmente como base, no menciona homeopatía/homotoxicología en
-- absoluto — esa afirmación provenía de páginas de mercadeo de
-- terceros, no de la norma). Queda bloqueada hasta que la clínica
-- confirme explícitamente, con su propia asesoría legal/tarifaria,
-- qué código quiere usar.
--
-- Fuente: catálogo público "Procedimiento del PBS" del Ministerio
-- de Salud (datos.gov.co, dataset 9zcz-bjue), verificado código
-- por código vía API SODA. Todos los códigos de este archivo
-- fueron confirmados contra esa fuente antes de sembrarse; ninguno
-- es aproximado ni inventado.
-- ============================================================

INSERT INTO cups_catalog (cups_code, procedure_name) VALUES
  ('890262', 'Consulta de primera vez por especialista en medicina del trabajo o seguridad y salud en el trabajo'),
  ('890362', 'Consulta de control o de seguimiento por especialista en medicina del trabajo o seguridad y salud en el trabajo'),
  ('890250', 'Consulta de primera vez por especialista en ginecología y obstetricia'),
  ('890350', 'Consulta de control o de seguimiento por especialista en ginecología y obstetricia'),
  ('890263', 'Consulta de primera vez por especialista en medicina familiar'),
  ('890363', 'Consulta de control o de seguimiento por especialista en medicina familiar'),
  ('890206', 'Consulta de primera vez por nutrición y dietética'),
  ('890306', 'Consulta de control o de seguimiento por nutrición y dietética')
ON CONFLICT (cups_code) DO NOTHING;

-- Medicina Laboral y Salud en el Trabajo comparten el mismo código oficial
-- ("...por especialista en medicina del trabajo O seguridad y salud en el
-- trabajo"), así que ambas especialidades mapean a los mismos candidatos.
-- "Valoración médica" no distingue primera vez/control → ambiguo (2 candidatos).
INSERT INTO service_classification_cups_map (specialty, service_group, service_subgroup, service_category, service_subcategory, cups_code)
VALUES
  ('Medicina Laboral',      '01', '0102', '010202', '01020201', '890262'),
  ('Medicina Laboral',      '01', '0102', '010202', '01020201', '890362'),
  ('Salud en el Trabajo',   '01', '0102', '010202', '01020201', '890262'),
  ('Salud en el Trabajo',   '01', '0102', '010202', '01020201', '890362')
ON CONFLICT DO NOTHING;

-- Ginecología: primera vez y control ya distinguidos en el árbol → únicos.
INSERT INTO service_classification_cups_map (specialty, service_group, service_subgroup, service_category, service_subcategory, cups_code)
VALUES
  ('Ginecología', '01', '0102', '010203', '01020301', '890250'),
  ('Ginecología', '01', '0102', '010203', '01020302', '890350')
ON CONFLICT DO NOTHING;

-- Medicina Familiar (código distinto del de "Salud Familiar y Comunitaria").
INSERT INTO service_classification_cups_map (specialty, service_group, service_subgroup, service_category, service_subcategory, cups_code)
VALUES
  ('Medicina Familiar', '01', '0102', '010204', '01020401', '890263'),
  ('Medicina Familiar', '01', '0102', '010204', '01020402', '890363')
ON CONFLICT DO NOTHING;

-- Nutrición y dietética.
INSERT INTO service_classification_cups_map (specialty, service_group, service_subgroup, service_category, service_subcategory, cups_code)
VALUES
  ('Nutrición', '01', '0105', '010501', '01050101', '890206'),
  ('Nutrición', '01', '0105', '010501', '01050102', '890306')
ON CONFLICT DO NOTHING;

-- Medicina Bioreguladora: sin CUPS oficial verificable (ver nota al inicio
-- del archivo). Deliberadamente sin fila aquí: cualquier intento de guardar
-- un servicio con esta especialidad quedará bloqueado hasta que se
-- configure un mapeo con respaldo confirmado.

-- Nota: Psicología (890208/890308) ya se siembra directamente con
-- specialty='Psicología' desde la migración 023.
