// ============================================================
// apps/backend/src/repositories/repsCatalog.repository.ts
// Repository: Catálogo oficial de la Tabla de Referencia de
// Servicios REPS (Resolución 3100 de 2019). Ver migración
// 031_reps_service_catalog.sql — service_catalog.reps_service_code
// referencia esta tabla por FK.
// ============================================================

import { pool } from '@config/database.js';

export interface RepsCatalogEntry {
  code: string;
  name: string;
}

export const RepsCatalogRepository = {
  /** Solo códigos activos — el select del formulario de servicios no debe ofrecer códigos dados de baja. */
  async listActive(): Promise<RepsCatalogEntry[]> {
    const { rows } = await pool.query(
      `SELECT service_code, service_name FROM reps_service_catalog WHERE is_active = true ORDER BY service_code ASC`
    );
    return rows.map((r) => ({ code: r.service_code, name: r.service_name }));
  },
};
