-- ============================================================
-- Migration 028: nombres de categoría para clasificación CUPS
-- generada dinámicamente (Grupo 04 Quirúrgico por ahora).
-- ============================================================
-- A diferencia del Grupo 01 (árbol estático en el frontend,
-- serviciosCatalogo.ts), el Grupo 04 tiene ~9.269 procedimientos
-- en 99 categorías (una por "capítulo" del código CUPS quirúrgico,
-- ej. 08 → Cirugía de párpado). Es demasiado volumen para vivir en
-- el bundle del frontend, así que Categoría/Subcategoría se sirven
-- bajo demanda desde el backend.
--
-- service_classification_cups_map ya guarda los códigos (categoría
-- = capítulo, subcategoría = cups_code); esta tabla solo agrega el
-- nombre legible de cada categoría, porque esa tabla no tiene
-- columna de nombre.
-- ============================================================

CREATE TABLE IF NOT EXISTS service_classification_categories (
  service_group     VARCHAR(10) NOT NULL,
  service_subgroup  VARCHAR(10) NOT NULL,
  service_category  VARCHAR(10) NOT NULL,
  category_name     VARCHAR(255) NOT NULL,
  PRIMARY KEY (service_group, service_subgroup, service_category)
);
