// ============================================================
// apps/backend/src/repositories/cups.repository.ts
// Repository: Catálogo oficial de CUPS y su mapeo con la
// clasificación de habilitación del servicio.
// ============================================================

import { pool } from '@config/database.js';

export interface CupsCandidate {
  cupsCode: string;
  procedureName: string;
}

export interface CupsCandidateOption {
  code: string;
  name: string;
}

export interface CupsCatalogEntry {
  cupsCode: string;
  procedureName: string;
  isActive: boolean;
  createdAt: string;
}

export interface CupsMapping {
  id: string;
  specialty: string;
  serviceGroup: string;
  serviceSubgroup: string;
  serviceCategory: string;
  serviceSubcategory: string;
  cupsCode: string;
  procedureName: string;
  isActive: boolean;
}

export interface CupsAuditEntry {
  id: string;
  entityType: 'catalog' | 'mapping';
  entityRef: string;
  action: 'create' | 'update' | 'deactivate' | 'reactivate' | 'delete';
  performedByEmail: string | null;
  details: unknown;
  createdAt: string;
}

export const CupsRepository = {
  /**
   * Categorías (capítulos) generadas dinámicamente para grupos con demasiadas
   * opciones para vivir en el árbol estático del frontend (ej. Grupo 04
   * Quirúrgico, ~9.000 procedimientos). Ver service_classification_categories.
   */
  async listClassificationCategories(serviceGroup: string, serviceSubgroup: string): Promise<CupsCandidateOption[]> {
    const { rows } = await pool.query(
      `SELECT service_category AS code, category_name AS name
         FROM service_classification_categories
        WHERE service_group = $1 AND service_subgroup = $2
        ORDER BY service_category ASC`,
      [serviceGroup, serviceSubgroup]
    );
    return rows.map((r) => ({ code: r.code, name: r.name }));
  },

  /**
   * Subcategorías dentro de una categoría dinámica: cada una es, en sí misma,
   * un código CUPS puntual (service_subcategory === cups_code, ver
   * generate-surgical-classification.ts), así que el nombre sale de
   * cups_catalog en vez de una tabla de nombres aparte.
   */
  async listClassificationSubcategories(
    serviceGroup: string,
    serviceSubgroup: string,
    serviceCategory: string
  ): Promise<CupsCandidateOption[]> {
    const { rows } = await pool.query(
      `SELECT DISTINCT m.service_subcategory AS code, c.procedure_name AS name
         FROM service_classification_cups_map m
         JOIN cups_catalog c ON c.cups_code = m.cups_code
        WHERE m.service_group = $1 AND m.service_subgroup = $2 AND m.service_category = $3
          AND m.is_active = true AND c.is_active = true
        ORDER BY name ASC`,
      [serviceGroup, serviceSubgroup, serviceCategory]
    );
    return rows.map((r) => ({ code: r.code, name: r.name }));
  },

  /**
   * Solo considera códigos/mapeos activos: uno inactivo deja de autocompletarse.
   * El CUPS se deriva únicamente de la clasificación (grupo/subgrupo/categoría/
   * subcategoría); `specialty` no participa en la búsqueda — varias filas de
   * distinta especialidad pueden compartir la misma clasificación, por eso se
   * usa DISTINCT para no repetir el mismo cups_code.
   */
  async findByClassification(
    serviceGroup: string,
    serviceSubgroup: string,
    serviceCategory: string,
    serviceSubcategory: string
  ): Promise<CupsCandidate[]> {
    const { rows } = await pool.query(
      `SELECT DISTINCT c.cups_code, c.procedure_name
         FROM service_classification_cups_map m
         JOIN cups_catalog c ON c.cups_code = m.cups_code
        WHERE m.service_group = $1
          AND m.service_subgroup = $2
          AND m.service_category = $3
          AND m.service_subcategory = $4
          AND m.is_active = true
          AND c.is_active = true
        ORDER BY c.cups_code ASC`,
      [serviceGroup, serviceSubgroup, serviceCategory, serviceSubcategory]
    );
    return rows.map((r) => ({ cupsCode: r.cups_code, procedureName: r.procedure_name }));
  },

  async listCatalog(): Promise<CupsCatalogEntry[]> {
    const { rows } = await pool.query(
      `SELECT cups_code, procedure_name, is_active, created_at FROM cups_catalog ORDER BY cups_code ASC`
    );
    return rows.map((r) => ({
      cupsCode: r.cups_code, procedureName: r.procedure_name, isActive: r.is_active, createdAt: r.created_at,
    }));
  },

  async createCatalogEntry(cupsCode: string, procedureName: string): Promise<CupsCatalogEntry> {
    const { rows } = await pool.query(
      `INSERT INTO cups_catalog (cups_code, procedure_name) VALUES ($1, $2)
       RETURNING cups_code, procedure_name, is_active, created_at`,
      [cupsCode, procedureName]
    );
    return { cupsCode: rows[0].cups_code, procedureName: rows[0].procedure_name, isActive: rows[0].is_active, createdAt: rows[0].created_at };
  },

  async updateCatalogEntry(cupsCode: string, changes: { procedureName?: string; isActive?: boolean }): Promise<CupsCatalogEntry | null> {
    const sets: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    if (changes.procedureName !== undefined) { sets.push(`procedure_name = $${i++}`); values.push(changes.procedureName); }
    if (changes.isActive !== undefined) { sets.push(`is_active = $${i++}`); values.push(changes.isActive); }
    if (sets.length === 0) {
      const { rows } = await pool.query(`SELECT cups_code, procedure_name, is_active, created_at FROM cups_catalog WHERE cups_code = $1`, [cupsCode]);
      return rows[0] ? { cupsCode: rows[0].cups_code, procedureName: rows[0].procedure_name, isActive: rows[0].is_active, createdAt: rows[0].created_at } : null;
    }
    values.push(cupsCode);
    const { rows } = await pool.query(
      `UPDATE cups_catalog SET ${sets.join(', ')} WHERE cups_code = $${i} RETURNING cups_code, procedure_name, is_active, created_at`,
      values
    );
    return rows[0] ? { cupsCode: rows[0].cups_code, procedureName: rows[0].procedure_name, isActive: rows[0].is_active, createdAt: rows[0].created_at } : null;
  },

  /** Falla con FK violation (código 23503) si algún mapeo todavía referencia este código. */
  async deleteCatalogEntry(cupsCode: string): Promise<boolean> {
    const { rowCount } = await pool.query(`DELETE FROM cups_catalog WHERE cups_code = $1`, [cupsCode]);
    return (rowCount ?? 0) > 0;
  },

  async listMappings(): Promise<CupsMapping[]> {
    const { rows } = await pool.query(
      `SELECT m.id, m.specialty, m.service_group, m.service_subgroup, m.service_category, m.service_subcategory,
              m.cups_code, m.is_active, c.procedure_name
         FROM service_classification_cups_map m
         JOIN cups_catalog c ON c.cups_code = m.cups_code
        ORDER BY m.specialty ASC, m.service_group ASC, m.service_subgroup ASC, m.service_category ASC, m.service_subcategory ASC`
    );
    return rows.map((r) => ({
      id: r.id, specialty: r.specialty,
      serviceGroup: r.service_group, serviceSubgroup: r.service_subgroup,
      serviceCategory: r.service_category, serviceSubcategory: r.service_subcategory,
      cupsCode: r.cups_code, procedureName: r.procedure_name, isActive: r.is_active,
    }));
  },

  async createMapping(
    specialty: string,
    serviceGroup: string,
    serviceSubgroup: string,
    serviceCategory: string,
    serviceSubcategory: string,
    cupsCode: string
  ): Promise<CupsMapping> {
    const { rows } = await pool.query(
      `INSERT INTO service_classification_cups_map
         (specialty, service_group, service_subgroup, service_category, service_subcategory, cups_code)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [specialty, serviceGroup, serviceSubgroup, serviceCategory, serviceSubcategory, cupsCode]
    );
    const catalog = await pool.query(`SELECT procedure_name FROM cups_catalog WHERE cups_code = $1`, [cupsCode]);
    return {
      id: rows[0].id, specialty, serviceGroup, serviceSubgroup, serviceCategory, serviceSubcategory,
      cupsCode, procedureName: catalog.rows[0]?.procedure_name ?? '', isActive: true,
    };
  },

  async findMappingById(id: string): Promise<CupsMapping | null> {
    const { rows } = await pool.query(
      `SELECT m.id, m.specialty, m.service_group, m.service_subgroup, m.service_category, m.service_subcategory,
              m.cups_code, m.is_active, c.procedure_name
         FROM service_classification_cups_map m
         JOIN cups_catalog c ON c.cups_code = m.cups_code
        WHERE m.id = $1`,
      [id]
    );
    if (!rows[0]) return null;
    const r = rows[0];
    return {
      id: r.id, specialty: r.specialty,
      serviceGroup: r.service_group, serviceSubgroup: r.service_subgroup,
      serviceCategory: r.service_category, serviceSubcategory: r.service_subcategory,
      cupsCode: r.cups_code, procedureName: r.procedure_name, isActive: r.is_active,
    };
  },

  async updateMappingActive(id: string, isActive: boolean): Promise<CupsMapping | null> {
    await pool.query(`UPDATE service_classification_cups_map SET is_active = $1 WHERE id = $2`, [isActive, id]);
    return this.findMappingById(id);
  },

  async deleteMapping(id: string): Promise<boolean> {
    const { rowCount } = await pool.query(`DELETE FROM service_classification_cups_map WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  },

  /** Cuenta cuántos service_offers ya guardados usan exactamente esta especialidad+clasificación+CUPS. */
  async countServicesUsingMapping(mapping: {
    specialty: string; serviceGroup: string; serviceSubgroup: string; serviceCategory: string; serviceSubcategory: string; cupsCode: string;
  }): Promise<number> {
    const { rows } = await pool.query(
      `SELECT COUNT(*) FROM service_offers
        WHERE specialty = $1 AND service_group = $2 AND service_subgroup = $3
          AND service_category = $4 AND service_subcategory = $5 AND cups = $6`,
      [mapping.specialty, mapping.serviceGroup, mapping.serviceSubgroup, mapping.serviceCategory, mapping.serviceSubcategory, mapping.cupsCode]
    );
    return parseInt(rows[0].count, 10);
  },

  async logAudit(entry: {
    entityType: 'catalog' | 'mapping';
    entityRef: string;
    action: 'create' | 'update' | 'deactivate' | 'reactivate' | 'delete';
    performedById?: string;
    performedByEmail?: string;
    details?: unknown;
  }): Promise<void> {
    await pool.query(
      `INSERT INTO cups_audit_log (entity_type, entity_ref, action, performed_by_id, performed_by_email, details)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [entry.entityType, entry.entityRef, entry.action, entry.performedById ?? null, entry.performedByEmail ?? null, entry.details ? JSON.stringify(entry.details) : null]
    );
  },

  async listAuditLog(limit = 200): Promise<CupsAuditEntry[]> {
    const { rows } = await pool.query(
      `SELECT id, entity_type, entity_ref, action, performed_by_email, details, created_at
         FROM cups_audit_log ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
    return rows.map((r) => ({
      id: r.id, entityType: r.entity_type, entityRef: r.entity_ref, action: r.action,
      performedByEmail: r.performed_by_email, details: r.details, createdAt: r.created_at,
    }));
  },
};
