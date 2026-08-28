// ============================================================
// apps/backend/src/controllers/services.controller.ts
// Controller: Gestión de Servicios
// Protección por roles: Admin = acceso completo
//                       User  = solo crear/cancelar sus reservas
// ============================================================

import type { Request, Response } from 'express';
import { pool } from '@config/database.js';
import {
  OperatingHoursRepository,
  RoomRepository,
  ServiceCatalogRepository,
  ServiceOfferRepository,
  BookingRequestRepository,
} from '@repositories/services.repository.js';
import { RepsCatalogRepository } from '@repositories/repsCatalog.repository.js';
import { resolveDiscount } from '@services/discount.service.js';
import { DiscountRepository } from '@repositories/discount.repository.js';
import type { AppliedDiscount } from '../types/discount.types.js';
import { sendServicePaymentConfirmation } from '@utils/email.util.js';
import { ensureDocSync } from '@services/docServiceSync.service.js';
import type {
  UpdateServiceOfferPayload,
  ServiceOffersFilter,
  ResolveBookingRequestPayload,
} from '@medisxime/shared-types';

const SERVICE_GROUP_CODES = ['01', '02', '03', '04', '05', '06'];
const MODALITY_CODES = ['01', '02', '03', '04', '05', '06', '08', '09'];
const CUPS_RE = /^[A-Za-z0-9]{6}$/;
const REPS_SERVICE_CODE_RE = /^\d{2,4}$/;

/** Valida y normaliza el payload de catálogo. Lanza {statusCode:400} con mensaje. */
function validateOfferPayload(body: Record<string, unknown>, partial: boolean): void {
  const err = (msg: string) => { throw Object.assign(new Error(msg), { statusCode: 400 }); };
  if (!partial || body.title !== undefined) {
    if (typeof body.title !== 'string' || !body.title.trim()) err('El nombre del servicio es requerido.');
  }
  if (body.serviceGroup !== undefined && body.serviceGroup !== null && !SERVICE_GROUP_CODES.includes(String(body.serviceGroup))) {
    err('Grupo de servicio inválido.');
  }
  if (body.cups !== undefined && body.cups !== null && body.cups !== '') {
    if (!CUPS_RE.test(String(body.cups))) err('El código CUPS debe tener 6 caracteres alfanuméricos.');
    // Mutación intencional: normaliza el CUPS a mayúsculas en el propio body antes de persistirlo.
    body.cups = String(body.cups).toUpperCase();
  }
  if (body.repsServiceCode !== undefined && body.repsServiceCode !== null && body.repsServiceCode !== '') {
    if (!REPS_SERVICE_CODE_RE.test(String(body.repsServiceCode))) err('Código de servicio (Tabla REPS) inválido.');
  }
  if (body.modalities !== undefined && body.modalities !== null) {
    if (!Array.isArray(body.modalities) || (body.modalities as unknown[]).some(m => !MODALITY_CODES.includes(String(m)))) {
      err('Modalidad de servicio inválida.');
    }
  }
  if (!partial || body.durationMinutes !== undefined) {
    if (typeof body.durationMinutes !== 'number' || body.durationMinutes <= 0) err('La duración del servicio debe ser mayor a 0.');
  }
  if (body.price !== undefined && body.price !== null && (typeof body.price !== 'number' || body.price < 0)) {
    err('El precio no puede ser negativo.');
  }
}

/** Build parameters for ensureDocSync call from offer data */
function buildDocSyncParams(
  offer: { catalogId: string | null; durationMinutes: number; price: number | null; title: string; catalog?: { serviceName: string; serviceGroup: string | null; description: string | null; basePrice: number | null; isActive: boolean } | null },
  active: boolean,
) {
  return {
    catalogId: offer.catalogId!,
    active,
    serviceName: offer.catalog?.serviceName ?? offer.title,
    durationMinutes: offer.durationMinutes,
    serviceGroup: offer.catalog?.serviceGroup ?? '01',
    description: offer.catalog?.description ?? null,
    price: Number(offer.catalog?.basePrice ?? offer.price ?? 0),
  };
}

const CATALOG_PAYLOAD_KEYS = [
  'serviceName', 'description', 'specialty', 'serviceGroup', 'serviceSubgroup',
  'serviceCategory', 'serviceSubcategory', 'cups', 'repsServiceCode', 'modalities', 'isActive',
  'basePrice', 'controlPrice', 'imageUrl', 'instructions', 'restrictions',
  'risks', 'contraindications',
];

/** Campos del catálogo que le importan a CuidameDoc — sólo un cambio en alguno de estos justifica un delete+create. */
const DOC_SYNC_RELEVANT_FIELDS = ['isActive', 'serviceName', 'serviceGroup', 'description', 'basePrice'] as const;

type DocSyncRelevantCatalog = {
  isActive: boolean;
  serviceName: string;
  serviceGroup: string | null;
  description: string | null;
  basePrice: number | null;
} | null | undefined;

function docSyncRelevantFieldsChanged(before: DocSyncRelevantCatalog, after: DocSyncRelevantCatalog): boolean {
  if (!before || !after) return true;
  return DOC_SYNC_RELEVANT_FIELDS.some((f) => before[f] !== after[f]);
}

// ─── OPERATING HOURS ─────────────────────────────────────────

export async function getOperatingHours(req: Request, res: Response): Promise<void> {
  try {
    const { locationId } = req.params;
    const hours = await OperatingHoursRepository.findByLocation(locationId);
    res.json({ success: true, data: { hours } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/** ADMIN ONLY */
export async function upsertOperatingHours(req: Request, res: Response): Promise<void> {
  try {
    const { locationId } = req.params;
    const { hours } = req.body;
    if (!Array.isArray(hours)) {
      res.status(400).json({ success: false, error: 'hours debe ser un array' });
      return;
    }
    const result = await OperatingHoursRepository.upsertMany(locationId, hours);
    res.json({ success: true, data: { hours: result } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

// ─── ROOMS ───────────────────────────────────────────────────

export async function getAllRooms(req: Request, res: Response): Promise<void> {
  try {
    const { locationId } = req.query;
    if (typeof locationId === 'string' && locationId) {
      const rooms = await RoomRepository.findByLocation(locationId);
      res.json({ success: true, data: { rooms } });
      return;
    }
    const { rows } = await RoomRepository.findAll();
    res.json({ success: true, data: { rooms: rows } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function getRoomsByLocation(req: Request, res: Response): Promise<void> {
  try {
    const { locationId } = req.params;
    const rooms = await RoomRepository.findByLocation(locationId);
    res.json({ success: true, data: { rooms } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/** ADMIN ONLY */
export async function createRoom(req: Request, res: Response): Promise<void> {
  try {
    const room = await RoomRepository.create(req.body);
    res.status(201).json({ success: true, data: { room } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/** ADMIN ONLY */
export async function updateRoom(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const room = await RoomRepository.update(id, req.body);
    if (!room) { res.status(404).json({ success: false, error: 'Salón no encontrado' }); return; }
    res.json({ success: true, data: { room } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/** ADMIN ONLY */
export async function deleteRoom(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const deleted = await RoomRepository.delete(id);
    if (!deleted) { res.status(404).json({ success: false, error: 'Salón no encontrado' }); return; }
    res.json({ success: true, data: null });
  } catch (err: unknown) {
    // 23503 = foreign_key_violation: el espacio tiene servicios/citas asociados (ON DELETE RESTRICT)
    if ((err as { code?: string }).code === '23503') {
      res.status(409).json({ success: false, error: 'No se puede eliminar: el espacio tiene servicios o citas asociados. Desactívalo en su lugar.' });
      return;
    }
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

// ─── SERVICE OFFERS ──────────────────────────────────────────

export async function listOffers(req: Request, res: Response): Promise<void> {
  try {
    const filter: ServiceOffersFilter = {
      locationId: req.query['locationId'] as string | undefined,
      offerType:  req.query['offerType']  as ServiceOffersFilter['offerType'],
      status:     req.query['status']     as ServiceOffersFilter['status'],
      from:       req.query['from']       as string | undefined,
      to:         req.query['to']         as string | undefined,
      page:       req.query['page']  ? parseInt(req.query['page']  as string, 10) : 1,
      limit:      req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : 20,
    };
    const { data, total } = await ServiceOfferRepository.findAll(filter);
    const limit = filter.limit ?? 20;
    res.json({
      success: true,
      data: {
        offers: data,
        total,
        page: filter.page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function getOffer(req: Request, res: Response): Promise<void> {
  try {
    const offer = await ServiceOfferRepository.findById(req.params['id']!);
    if (!offer) { res.status(404).json({ success: false, error: 'Oferta no encontrada' }); return; }
    res.json({ success: true, data: { offer } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/** ADMIN ONLY — catálogo activo de la Tabla de Referencia de Servicios REPS (Resolución 3100 de 2019). */
export async function listRepsCatalog(_req: Request, res: Response): Promise<void> {
  try {
    const services = await RepsCatalogRepository.listActive();
    res.json({ success: true, data: { services } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/** ADMIN ONLY — auth guard desactivado temporalmente para desarrollo */
export async function createOffer(req: Request, res: Response): Promise<void> {
  try {
    let adminId = req.user?.id;
    if (!adminId) {
      const adminRes = await pool.query("SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1");
      adminId = adminRes.rows[0]?.id;
    }
    if (!adminId) {
      res.status(400).json({ success: false, error: 'No se encontró un administrador en la BD para asignar creador.' });
      return;
    }
    validateOfferPayload(req.body, false);
    // Los servicios del catálogo médico son individuales; se usa 1 como default
    // para que el trigger de BD no rechace la inserción por superar la cap. del espacio.
    if (req.body.capacity === undefined || req.body.capacity === null) req.body.capacity = 1;
    if (req.body.scheduledAt === undefined) req.body.scheduledAt = null;
    const payload = req.body as any;
    // El formulario envía `title`/`price` (contrato de service_offers), pero el catálogo
    // espera `serviceName`/`basePrice`. Sin esto, service_catalog.service_name llega NULL
    // (columna NOT NULL → 500 en cada creación) y base_price siempre cae en su default 0
    // (ver hallazgos C1/C3 de la revisión de rama).
    if (payload.serviceName === undefined) payload.serviceName = payload.title;
    if (payload.basePrice === undefined) payload.basePrice = payload.price;

    // Catálogo + oferta se crean en una sola transacción (ver I5): si el INSERT de la
    // oferta falla (p. ej. trigger de capacidad del salón, roomId/locationId inválido),
    // el catálogo recién creado se revierte en vez de quedar huérfano.
    const offer = await ServiceOfferRepository.createWithCatalog(payload, adminId);

    const docSync = await ensureDocSync(buildDocSyncParams(offer, offer.catalog?.isActive !== false));
    if (!docSync.ok) console.error(`[ensureDocSync] createOffer catalogId=${offer.catalogId} falló: ${docSync.error}`);

    res.status(201).json({ success: true, data: { offer }, docSync });
  } catch (err: unknown) {
    const msg = (err as Error).message;
    const status = (err as { statusCode?: number }).statusCode ?? (msg.includes('supera la del salón') ? 400 : 500);
    res.status(status).json({ success: false, error: msg });
  }
}

/** ADMIN ONLY */
export async function updateOffer(req: Request, res: Response): Promise<void> {
  try {
    validateOfferPayload(req.body, true);
    const payload = req.body as any;
    // Mismo puente de contrato que en createOffer (ver C1/C3): si el payload trae `title`/`price`
    // pero no `serviceName`/`basePrice`, se normaliza ANTES de calcular `catalogTouched` para que
    // un PATCH que sólo envía `title` siga marcando el catálogo como tocado.
    if (payload.serviceName === undefined) payload.serviceName = payload.title;
    if (payload.basePrice === undefined) payload.basePrice = payload.price;
    const offerId = req.params['id']!;

    const existingOffer = await ServiceOfferRepository.findById(offerId);
    if (!existingOffer) { res.status(404).json({ success: false, error: 'Oferta no encontrada' }); return; }

    let catalogId = existingOffer.catalogId;
    const catalogTouched = CATALOG_PAYLOAD_KEYS.some((k) => payload[k] !== undefined);
    const catalogBefore = existingOffer.catalog;

    if (catalogId) {
      if (catalogTouched) await ServiceCatalogRepository.update(catalogId, payload);
    } else if (payload.serviceName) {
      const newCatalog = await ServiceCatalogRepository.create(payload);
      catalogId = newCatalog.id;
      await ServiceOfferRepository.update(offerId, { catalogId } as UpdateServiceOfferPayload);
    }

    const offer = await ServiceOfferRepository.update(offerId, { ...payload, catalogId: catalogId ?? undefined } as UpdateServiceOfferPayload);
    if (!offer) { res.status(404).json({ success: false, error: 'Oferta no encontrada' }); return; }

    let docSync: { ok: boolean; error?: string } | undefined;
    if (offer.catalogId && ((catalogTouched && docSyncRelevantFieldsChanged(catalogBefore, offer.catalog)) || offer.durationMinutes !== existingOffer.durationMinutes)) {
      docSync = await ensureDocSync(buildDocSyncParams(offer, offer.catalog?.isActive !== false));
      if (!docSync.ok) console.error(`[ensureDocSync] updateOffer catalogId=${offer.catalogId} falló: ${docSync.error}`);
    }

    res.json({ success: true, data: { offer }, ...(docSync ? { docSync } : {}) });
  } catch (err: unknown) {
    const msg = (err as Error).message;
    const status = (err as { statusCode?: number }).statusCode ?? (msg.includes('supera la del salón') ? 400 : 500);
    res.status(status).json({ success: false, error: msg });
  }
}

/** ADMIN ONLY */
export async function deleteOffer(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params['id']!;
    const existing = await ServiceOfferRepository.findById(id);
    if (!existing) { res.status(404).json({ success: false, error: 'Oferta no encontrada' }); return; }

    const { deleted, remaining } = await ServiceOfferRepository.deleteAndCountRemaining(id, existing.catalogId);
    if (!deleted) { res.status(404).json({ success: false, error: 'Oferta no encontrada' }); return; }

    let docSync: { ok: boolean; error?: string } | undefined;
    if (existing.catalogId && remaining === 0) {
      docSync = await ensureDocSync(buildDocSyncParams(existing, false));
      if (!docSync.ok) console.error(`[ensureDocSync] deleteOffer catalogId=${existing.catalogId} falló: ${docSync.error}`);
    }

    res.json({ success: true, data: null, ...(docSync ? { docSync } : {}) });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

// ─── BOOKING REQUESTS ────────────────────────────────────────

/** ADMIN: ver todas las solicitudes de una oferta */
export async function listBookingRequests(req: Request, res: Response): Promise<void> {
  try {
    const requests = await BookingRequestRepository.findByOffer(req.params['offerId']!);
    res.json({ success: true, data: { requests } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/** ADMIN: todas las inscripciones con filtro opcional por status */
export async function listAllBookingRequests(req: Request, res: Response): Promise<void> {
  try {
    const status = req.query['status'] as string | undefined;
    const requests = await BookingRequestRepository.findAll(status);
    res.json({ success: true, data: { requests } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/** USER: ver mis propias solicitudes */
export async function myBookingRequests(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ success: false, error: 'No autenticado' }); return; }
    const requests = await BookingRequestRepository.findByUser(userId);
    res.json({ success: true, data: { requests } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/** USER: inscribirse a un servicio recurrente — crea UNA solicitud que el admin aprueba */
export async function createBulkBookingRequests(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ success: false, error: 'No autenticado' }); return; }
    const { offerIds, paymentMethod, discountCode } = req.body as {
      offerIds: string[]; paymentMethod?: 'cash' | 'wompi'; discountCode?: string;
    };
    if (!Array.isArray(offerIds) || offerIds.length === 0) {
      res.status(400).json({ success: false, error: 'offerIds debe ser un array no vacío' }); return;
    }

    // Validate the lead offer (first session)
    const lead = await ServiceOfferRepository.findById(offerIds[0]);
    if (!lead) { res.status(404).json({ success: false, error: 'Oferta no encontrada' }); return; }
    if (lead.enrolledCount >= lead.capacity) {
      res.status(409).json({ success: false, error: 'No hay cupos disponibles' }); return;
    }
    if (lead.status !== 'published') {
      res.status(400).json({ success: false, error: 'La oferta no está disponible' }); return;
    }

    // Validar CADA sesión del grupo, no solo la lead — un usuario no debe
    // poder colar IDs de otras ofertas (llenas, sin publicar, o de otro
    // servicio/precio) en el resto del array y quedar auto-aprobado.
    const siblingIds = offerIds.slice(1);
    const uniqueSiblingIds = [...new Set(siblingIds)];
    if (uniqueSiblingIds.length > 0) {
      const siblingOffers = await Promise.all(uniqueSiblingIds.map(id => ServiceOfferRepository.findById(id)));
      for (let i = 0; i < uniqueSiblingIds.length; i++) {
        const offer = siblingOffers[i];
        if (!offer) { res.status(404).json({ success: false, error: 'Una de las sesiones no existe' }); return; }
        if (offer.status !== 'published') {
          res.status(400).json({ success: false, error: 'Una de las sesiones no está disponible' }); return;
        }
        if (offer.enrolledCount >= offer.capacity) {
          res.status(409).json({ success: false, error: 'Una de las sesiones no tiene cupos disponibles' }); return;
        }
        // Misma oferta de catálogo que la lead — evita mezclar sesiones de
        // servicios/profesionales no relacionados en una sola inscripción.
        if (lead.catalogId != null && offer.catalogId !== lead.catalogId) {
          res.status(400).json({ success: false, error: 'Todas las sesiones deben pertenecer al mismo servicio' }); return;
        }
      }
    }

    // ── Precio con descuentos (módulo Descuentos) ─────────────────────────
    const sessionCount = offerIds.length;
    const pricePerSession = lead.price ?? 0;

    // Las ofertas codifican su categoría en el título con formato "Categoría — Tipo"
    // (ver ServiciosDashboard.tsx); discipline_id suele venir null, así que no basta
    // con lead.discipline?.name para casar descuentos por especialidad.
    const titleCategory = typeof lead.title === 'string' && lead.title.trim()
      ? lead.title.split(' — ')[0].trim()
      : null;
    const offerSpecialty = lead.catalog?.specialty ?? titleCategory ?? lead.discipline?.name ?? null;

    let applied: AppliedDiscount | null = null;
    try {
      applied = await resolveDiscount({
        userId,
        specialty: offerSpecialty,
        sessionCount,
        pricePerSession,
        code: discountCode,
      });
    } catch (err: unknown) {
      const status = (err as { statusCode?: number }).statusCode ?? 500;
      res.status(status).json({ success: false, error: (err as Error).message });
      return;
    }

    const computedExpectedAmount = pricePerSession > 0
      ? (applied ? applied.expectedAmount : sessionCount * pricePerSession)
      : undefined;
    const computedDiscountPct = applied?.discountPct;

    const request = await BookingRequestRepository.createGroupEnrollment(
      offerIds, userId,
      {
        paymentMethod: paymentMethod ?? 'cash',
        expectedAmount: computedExpectedAmount,
        discountPct: computedDiscountPct,
      }
    );

    if (applied && request.wasCreated) {
      await DiscountRepository.redeem(applied.discountId, userId, request.id);
    }

    res.status(201).json({ success: true, data: { request, sessionCount } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/** USER: obtener todas las sesiones aprobadas para el calendario */
export async function myCalendarSessions(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ success: false, error: 'No autenticado' }); return; }
    const sessions = await BookingRequestRepository.findApprovedSessionsByUser(userId);
    res.json({ success: true, data: { sessions } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/** ADMIN: asignar monto a una inscripción gratuita → la mueve a Finanzas */
export async function setBookingPayment(req: Request, res: Response): Promise<void> {
  try {
    const adminId = req.user?.id;
    if (!adminId) { res.status(401).json({ success: false, error: 'No autenticado' }); return; }
    const { id } = req.params;
    const { expectedAmount, discountPct, paymentMethod } = req.body as {
      expectedAmount: number; discountPct?: number; paymentMethod?: 'cash' | 'wompi';
    };
    if (!expectedAmount || expectedAmount <= 0) {
      res.status(400).json({ success: false, error: 'expectedAmount debe ser mayor a 0' }); return;
    }
    await pool.query(
      `UPDATE booking_requests
       SET expected_amount = $1, discount_pct = $2, payment_method = $3, updated_at = NOW()
       WHERE id = $4`,
      [expectedAmount, discountPct ?? null, paymentMethod ?? 'cash', id]
    );
    res.json({ success: true, data: null });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/** USER: solicitar reserva */
export async function createBookingRequest(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ success: false, error: 'No autenticado' }); return; }
    const { offerId } = req.body as { offerId: string };
    if (!offerId) { res.status(400).json({ success: false, error: 'offerId es requerido' }); return; }

    // Verificar que la oferta existe y tiene cupo
    const offer = await ServiceOfferRepository.findById(offerId);
    if (!offer) { res.status(404).json({ success: false, error: 'Oferta no encontrada' }); return; }
    if (offer.enrolledCount >= offer.capacity) {
      res.status(409).json({ success: false, error: 'No hay cupos disponibles' }); return;
    }
    if (offer.status !== 'published') {
      res.status(400).json({ success: false, error: 'La oferta no está disponible' }); return;
    }

    const request = await BookingRequestRepository.create(offerId, userId);
    res.status(201).json({ success: true, data: { request } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/** ADMIN ONLY: listar pagos de servicios pendientes (expectedAmount > 0) */
export async function listPendingServicePayments(_req: Request, res: Response): Promise<void> {
  try {
    const requests = await BookingRequestRepository.findPendingServicePayments();
    res.json({ success: true, data: { requests } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/** ADMIN ONLY: confirmar pago de un servicio y auto-aprobar la inscripción */
export async function confirmServicePayment(req: Request, res: Response): Promise<void> {
  try {
    const adminId = req.user?.id;
    if (!adminId) { res.status(401).json({ success: false, error: 'No autenticado' }); return; }

    const { id } = req.params;
    if (!id) { res.status(400).json({ success: false, error: 'id es requerido' }); return; }

    const request = await BookingRequestRepository.confirmServicePayment(id, adminId);
    if (!request) { res.status(404).json({ success: false, error: 'Solicitud no encontrada' }); return; }

    // Send service confirmation email to the user
    try {
      await sendServicePaymentConfirmation(request.user.email, {
        userName:      `${request.user.firstName} ${request.user.lastName}`.trim(),
        serviceName:   (request as any).offerTitle ?? 'Servicio',
        scheduledAt:   (request as any).scheduledAt ?? null,
        sessionCount:  (request as any).sessionCount ?? 1,
        amountPaid:    (request as any).expectedAmount ?? 0,
        paymentMethod: (request as any).paymentMethod ?? 'cash',
        locationName:  (request as any).locationName ?? null,
      });
    } catch {
      // Non-fatal: email failure should not block the confirmation response
    }

    res.json({ success: true, data: { request } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/** ADMIN ONLY: rechazar un pago de servicio pendiente → marca la solicitud como rechazada */
export async function rejectServicePayment(req: Request, res: Response): Promise<void> {
  try {
    const adminId = req.user?.id;
    if (!adminId) { res.status(401).json({ success: false, error: 'No autenticado' }); return; }
    const { id } = req.params;
    if (!id) { res.status(400).json({ success: false, error: 'id es requerido' }); return; }
    await pool.query(
      `UPDATE booking_requests
       SET status = 'rejected', resolved_by = $1, resolved_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [adminId, id]
    );
    res.json({ success: true, data: null });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/** ADMIN ONLY: eliminar permanentemente una solicitud de servicio */
export async function deleteServicePayment(req: Request, res: Response): Promise<void> {
  try {
    const adminId = req.user?.id;
    if (!adminId) { res.status(401).json({ success: false, error: 'No autenticado' }); return; }
    const { id } = req.params;
    if (!id) { res.status(400).json({ success: false, error: 'id es requerido' }); return; }
    await pool.query(`DELETE FROM booking_requests WHERE id = $1`, [id]);
    res.json({ success: true, data: null });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/** ADMIN ONLY: aprobar o rechazar una solicitud */
export async function resolveBookingRequest(req: Request, res: Response): Promise<void> {
  try {
    const adminId = req.user?.id;
    if (!adminId) { res.status(401).json({ success: false, error: 'No autenticado' }); return; }

    const { id } = req.params;
    const { status, rejectReason } = req.body as ResolveBookingRequestPayload;

    if (!['approved', 'rejected'].includes(status)) {
      res.status(400).json({ success: false, error: 'status debe ser approved o rejected' });
      return;
    }
    if (status === 'rejected' && !rejectReason) {
      res.status(400).json({ success: false, error: 'rejectReason es requerido al rechazar' });
      return;
    }

    const request = await BookingRequestRepository.resolve(id!, adminId, status, rejectReason);
    if (!request) { res.status(404).json({ success: false, error: 'Solicitud no encontrada' }); return; }
    res.json({ success: true, data: { request } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}
