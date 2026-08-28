-- ============================================================
-- Migration 030: Código de servicio habilitado (Tabla de Referencia REPS)
-- ============================================================
-- Se asigna manualmente en el formulario justo después del Código CUPS
-- (ver Tabla de Referencia de Servicios, Resolución 3100 de 2019). Igual que
-- `cups`, no aplica cuando service_group = '06' (Otros servicios).

ALTER TABLE service_catalog ADD COLUMN IF NOT EXISTS reps_service_code VARCHAR(10);
