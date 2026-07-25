// ============================================================
// apps/backend/src/controllers/cups.controller.ts
// Controller: Catálogo CUPS, sus mapeos con la clasificación de
// servicios, y su auditoría.
// ============================================================

import type { Request, Response } from 'express';
import { CupsRepository } from '@repositories/cups.repository.js';

// Los códigos CUPS oficiales varían en longitud (ej. 890201 tiene 6 dígitos,
// algunos capítulos de medicina alternativa usan 5); no se restringe a un
// largo fijo como sí lo hace el campo cups de service_offers.
const CUPS_CODE_RE = /^[A-Za-z0-9]{4,10}$/;

/**
 * ADMIN ONLY — usado por el formulario de servicios al elegir la Subcategoría.
 * El CUPS se calcula solo con grupo/subgrupo/categoría/subcategoría; `specialty`
 * ya no se usa para la búsqueda (se acepta si llega, pero se ignora) — ver nota
 * en CupsRepository.findByClassification.
 */
export async function lookupCups(req: Request, res: Response): Promise<void> {
  try {
    const serviceGroup       = req.query['serviceGroup'] as string | undefined;
    const serviceSubgroup    = req.query['serviceSubgroup'] as string | undefined;
    const serviceCategory    = req.query['serviceCategory'] as string | undefined;
    const serviceSubcategory = req.query['serviceSubcategory'] as string | undefined;

    if (!serviceGroup || !serviceSubgroup || !serviceCategory || !serviceSubcategory) {
      res.status(400).json({ success: false, error: 'Se requiere grupo, subgrupo, categoría y subcategoría de servicio.' });
      return;
    }

    const candidates = await CupsRepository.findByClassification(
      serviceGroup, serviceSubgroup, serviceCategory, serviceSubcategory
    );

    if (candidates.length === 0) {
      res.status(404).json({
        success: false,
        error: 'No se registra código CUPS para esta combinación. Revisa las opciones seleccionadas.',
      });
      return;
    }

    if (candidates.length === 1) {
      res.json({ success: true, data: { match: 'unique' as const, cupsCode: candidates[0].cupsCode, procedureName: candidates[0].procedureName } });
      return;
    }

    res.json({ success: true, data: { match: 'ambiguous' as const, candidates } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/**
 * ADMIN ONLY — Categorías (capítulos) de un Grupo/Subgrupo con clasificación
 * generada dinámicamente (ej. Grupo 04 Quirúrgico). Grupos con árbol estático
 * (01, 03, 05, y 02 por ahora) no tienen filas aquí y el frontend sigue
 * usando serviciosCatalogo.ts para esos.
 */
export async function listClassificationCategories(req: Request, res: Response): Promise<void> {
  try {
    const serviceGroup = req.query['serviceGroup'] as string | undefined;
    const serviceSubgroup = req.query['serviceSubgroup'] as string | undefined;
    if (!serviceGroup || !serviceSubgroup) {
      res.status(400).json({ success: false, error: 'Se requiere grupo y subgrupo de servicio.' });
      return;
    }
    const categories = await CupsRepository.listClassificationCategories(serviceGroup, serviceSubgroup);
    res.json({ success: true, data: { categories } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/** ADMIN ONLY — Subcategorías (procedimientos puntuales) dentro de una categoría dinámica. */
export async function listClassificationSubcategories(req: Request, res: Response): Promise<void> {
  try {
    const serviceGroup = req.query['serviceGroup'] as string | undefined;
    const serviceSubgroup = req.query['serviceSubgroup'] as string | undefined;
    const serviceCategory = req.query['serviceCategory'] as string | undefined;
    if (!serviceGroup || !serviceSubgroup || !serviceCategory) {
      res.status(400).json({ success: false, error: 'Se requiere grupo, subgrupo y categoría de servicio.' });
      return;
    }
    const subcategories = await CupsRepository.listClassificationSubcategories(serviceGroup, serviceSubgroup, serviceCategory);
    res.json({ success: true, data: { subcategories } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/** ADMIN ONLY — pantalla de administración del catálogo CUPS. */
export async function listCupsCatalog(_req: Request, res: Response): Promise<void> {
  try {
    const catalog = await CupsRepository.listCatalog();
    res.json({ success: true, data: { catalog } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/** ADMIN ONLY */
export async function createCupsCatalogEntry(req: Request, res: Response): Promise<void> {
  try {
    const cupsCode = typeof req.body.cupsCode === 'string' ? req.body.cupsCode.trim().toUpperCase() : '';
    const procedureName = typeof req.body.procedureName === 'string' ? req.body.procedureName.trim() : '';

    if (!CUPS_CODE_RE.test(cupsCode)) {
      res.status(400).json({ success: false, error: 'El código CUPS debe ser alfanumérico (4 a 10 caracteres).' });
      return;
    }
    if (!procedureName) {
      res.status(400).json({ success: false, error: 'El nombre oficial del procedimiento es requerido.' });
      return;
    }

    const entry = await CupsRepository.createCatalogEntry(cupsCode, procedureName);
    await CupsRepository.logAudit({
      entityType: 'catalog', entityRef: cupsCode, action: 'create',
      performedById: req.user?.id, performedByEmail: req.user?.email,
      details: { procedureName },
    });
    res.status(201).json({ success: true, data: { entry } });
  } catch (err: unknown) {
    const pgErr = err as { code?: string };
    if (pgErr.code === '23505') {
      res.status(409).json({ success: false, error: 'Ese código CUPS ya existe en el catálogo.' });
      return;
    }
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/** ADMIN ONLY — renombrar y/o activar/desactivar un código del catálogo. */
export async function updateCupsCatalogEntry(req: Request, res: Response): Promise<void> {
  try {
    const cupsCode = (req.params['cupsCode'] as string).toUpperCase();
    const changes: { procedureName?: string; isActive?: boolean } = {};

    if (req.body.procedureName !== undefined) {
      const procedureName = typeof req.body.procedureName === 'string' ? req.body.procedureName.trim() : '';
      if (!procedureName) { res.status(400).json({ success: false, error: 'El nombre oficial del procedimiento no puede quedar vacío.' }); return; }
      changes.procedureName = procedureName;
    }
    if (req.body.isActive !== undefined) {
      if (typeof req.body.isActive !== 'boolean') { res.status(400).json({ success: false, error: 'isActive debe ser verdadero o falso.' }); return; }
      changes.isActive = req.body.isActive;
    }
    if (Object.keys(changes).length === 0) {
      res.status(400).json({ success: false, error: 'No hay cambios para aplicar.' });
      return;
    }

    const entry = await CupsRepository.updateCatalogEntry(cupsCode, changes);
    if (!entry) { res.status(404).json({ success: false, error: 'Código CUPS no encontrado.' }); return; }

    const action = changes.isActive === false ? 'deactivate' : changes.isActive === true ? 'reactivate' : 'update';
    await CupsRepository.logAudit({
      entityType: 'catalog', entityRef: cupsCode, action,
      performedById: req.user?.id, performedByEmail: req.user?.email,
      details: changes,
    });
    res.json({ success: true, data: { entry } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/** ADMIN ONLY — bloquea el borrado si algún mapeo todavía usa este código. */
export async function deleteCupsCatalogEntry(req: Request, res: Response): Promise<void> {
  try {
    const cupsCode = (req.params['cupsCode'] as string).toUpperCase();
    const deleted = await CupsRepository.deleteCatalogEntry(cupsCode);
    if (!deleted) { res.status(404).json({ success: false, error: 'Código CUPS no encontrado.' }); return; }

    await CupsRepository.logAudit({
      entityType: 'catalog', entityRef: cupsCode, action: 'delete',
      performedById: req.user?.id, performedByEmail: req.user?.email,
    });
    res.json({ success: true });
  } catch (err: unknown) {
    const pgErr = err as { code?: string };
    if (pgErr.code === '23503') {
      res.status(409).json({
        success: false,
        error: 'Este código CUPS está siendo usado por uno o más mapeos y no se puede eliminar. Márcalo como inactivo en su lugar.',
      });
      return;
    }
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/** ADMIN ONLY */
export async function listCupsMappings(_req: Request, res: Response): Promise<void> {
  try {
    const mappings = await CupsRepository.listMappings();
    res.json({ success: true, data: { mappings } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/** ADMIN ONLY */
export async function createCupsMapping(req: Request, res: Response): Promise<void> {
  try {
    const specialty          = typeof req.body.specialty === 'string' ? req.body.specialty.trim() : '';
    const serviceGroup       = typeof req.body.serviceGroup === 'string' ? req.body.serviceGroup.trim() : '';
    const serviceSubgroup    = typeof req.body.serviceSubgroup === 'string' ? req.body.serviceSubgroup.trim() : '';
    const serviceCategory    = typeof req.body.serviceCategory === 'string' ? req.body.serviceCategory.trim() : '';
    const serviceSubcategory = typeof req.body.serviceSubcategory === 'string' ? req.body.serviceSubcategory.trim() : '';
    const cupsCode           = typeof req.body.cupsCode === 'string' ? req.body.cupsCode.trim().toUpperCase() : '';

    if (!specialty || !serviceGroup || !serviceSubgroup || !serviceCategory || !serviceSubcategory || !cupsCode) {
      res.status(400).json({ success: false, error: 'Se requiere especialidad, grupo, subgrupo, categoría, subcategoría y código CUPS.' });
      return;
    }

    const mapping = await CupsRepository.createMapping(
      specialty, serviceGroup, serviceSubgroup, serviceCategory, serviceSubcategory, cupsCode
    );
    await CupsRepository.logAudit({
      entityType: 'mapping', entityRef: mapping.id, action: 'create',
      performedById: req.user?.id, performedByEmail: req.user?.email,
      details: { specialty, serviceGroup, serviceSubgroup, serviceCategory, serviceSubcategory, cupsCode },
    });
    res.status(201).json({ success: true, data: { mapping } });
  } catch (err: unknown) {
    const pgErr = err as { code?: string; constraint?: string };
    if (pgErr.code === '23505') {
      res.status(409).json({ success: false, error: 'Ya existe ese mapeo exacto (especialidad + clasificación + CUPS).' });
      return;
    }
    if (pgErr.code === '23503') {
      res.status(400).json({ success: false, error: 'Ese código CUPS no existe en el catálogo; agrégalo primero.' });
      return;
    }
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/** ADMIN ONLY — activar/desactivar un mapeo. */
export async function updateCupsMapping(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params['id'] as string;
    if (typeof req.body.isActive !== 'boolean') {
      res.status(400).json({ success: false, error: 'isActive debe ser verdadero o falso.' });
      return;
    }

    const mapping = await CupsRepository.updateMappingActive(id, req.body.isActive);
    if (!mapping) { res.status(404).json({ success: false, error: 'Mapeo no encontrado.' }); return; }

    await CupsRepository.logAudit({
      entityType: 'mapping', entityRef: id, action: req.body.isActive ? 'reactivate' : 'deactivate',
      performedById: req.user?.id, performedByEmail: req.user?.email,
    });
    res.json({ success: true, data: { mapping } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/** ADMIN ONLY — bloquea el borrado si ya hay servicios guardados que usan este mapeo. */
export async function deleteCupsMapping(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params['id'] as string;
    const mapping = await CupsRepository.findMappingById(id);
    if (!mapping) { res.status(404).json({ success: false, error: 'Mapeo no encontrado.' }); return; }

    const inUseCount = await CupsRepository.countServicesUsingMapping(mapping);
    if (inUseCount > 0) {
      res.status(409).json({
        success: false,
        error: `Este mapeo ya está asociado a ${inUseCount} servicio(s) existente(s) y no se puede eliminar. Márcalo como inactivo en su lugar.`,
      });
      return;
    }

    await CupsRepository.deleteMapping(id);
    await CupsRepository.logAudit({
      entityType: 'mapping', entityRef: id, action: 'delete',
      performedById: req.user?.id, performedByEmail: req.user?.email,
      details: { specialty: mapping.specialty, cupsCode: mapping.cupsCode },
    });
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/** ADMIN ONLY — historial de auditoría del catálogo/mapeos CUPS. */
export async function listCupsAuditLog(_req: Request, res: Response): Promise<void> {
  try {
    const log = await CupsRepository.listAuditLog();
    res.json({ success: true, data: { log } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}
