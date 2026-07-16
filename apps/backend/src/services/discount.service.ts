import { DiscountRepository } from '@repositories/discount.repository.js'
import type { DiscountRecord, DiscountKind, AppliedDiscount, CreateDiscountDTO } from '../types/discount.types.js'

function err400(msg: string): Error {
  return Object.assign(new Error(msg), { statusCode: 400 })
}

/** Normaliza y valida un DTO de creación/edición. Devuelve { value, code } normalizados. */
export function validateDiscountDTO(dto: CreateDiscountDTO): { value: number | null; code: string | null } {
  if (!dto.name?.trim()) throw err400('El nombre es requerido.')
  if (dto.kind !== 'percentage' && dto.kind !== 'two_for_one') throw err400('Tipo de descuento inválido.')

  let value: number | null = null
  if (dto.kind === 'percentage') {
    if (dto.value == null || !Number.isInteger(dto.value) || dto.value < 1 || dto.value > 100) {
      throw err400('El valor debe ser un porcentaje entre 1 y 100.')
    }
    value = dto.value
  }

  const code = dto.code?.trim() ? dto.code.trim().toUpperCase().replace(/\s+/g, '') : null

  if (dto.startsAt && dto.endsAt && dto.startsAt > dto.endsAt) {
    throw err400('La fecha de inicio debe ser anterior a la fecha fin.')
  }
  if (dto.maxUsesTotal != null && dto.maxUsesTotal < 1) throw err400('El límite de usos totales debe ser mayor a 0.')
  if (dto.maxUsesPerPatient != null && dto.maxUsesPerPatient < 1) throw err400('El límite por paciente debe ser mayor a 0.')

  return { value, code }
}

interface ResolveParams {
  userId:          string
  specialty:       string | null
  sessionCount:    number
  pricePerSession: number
  code?:           string
}

interface Ineligibility { reason: string }

/** null = elegible; si no, el motivo. NO consulta redenciones (eso es aparte, async). */
function ineligible(d: DiscountRecord, p: ResolveParams): Ineligibility | null {
  const today = new Date().toISOString().slice(0, 10)
  if (!d.is_active) return { reason: 'El código no está activo.' }
  if (d.starts_at && new Date(d.starts_at).toISOString().slice(0, 10) > today) return { reason: 'El código aún no está vigente.' }
  if (d.ends_at && new Date(d.ends_at).toISOString().slice(0, 10) < today) return { reason: 'El código está vencido.' }
  if (d.max_uses_total != null && d.uses_count >= d.max_uses_total) return { reason: 'El código está agotado.' }
  if (d.specialty && d.specialty !== p.specialty) return { reason: 'El código no aplica a este servicio.' }
  if (d.kind === 'two_for_one' && p.sessionCount < 2) return { reason: 'El 2x1 requiere al menos 2 sesiones.' }
  return null
}

function amounts(d: DiscountRecord, p: ResolveParams): { expectedAmount: number; discountPct: number } {
  if (d.kind === 'percentage') {
    const pct = d.value ?? 0
    return {
      expectedAmount: p.sessionCount * Math.round(p.pricePerSession * (1 - pct / 100)),
      discountPct: pct,
    }
  }
  const paid = Math.ceil(p.sessionCount / 2)
  return {
    expectedAmount: paid * p.pricePerSession,
    discountPct: Math.round(100 * (1 - paid / p.sessionCount)),
  }
}

function toApplied(d: DiscountRecord, p: ResolveParams): AppliedDiscount {
  const a = amounts(d, p)
  return { discountId: d.id, name: d.name, kind: d.kind as DiscountKind, ...a }
}

export async function resolveDiscount(p: ResolveParams): Promise<AppliedDiscount | null> {
  if (p.sessionCount < 1 || p.pricePerSession <= 0) {
    if (p.code) throw err400('El código no aplica a este servicio.')
    return null
  }

  if (p.code) {
    const code = p.code.trim().toUpperCase().replace(/\s+/g, '')
    const d = await DiscountRepository.findByCode(code)
    if (!d) throw err400('Código inválido.')
    const why = ineligible(d, p)
    if (why) throw err400(why.reason)
    if (d.max_uses_per_patient != null) {
      const used = await DiscountRepository.countUserRedemptions(d.id, p.userId)
      if (used >= d.max_uses_per_patient) throw err400('Ya usaste este código el máximo de veces.')
    }
    return toApplied(d, p)
  }

  const candidates = await DiscountRepository.findAutomaticCandidates()
  let best: AppliedDiscount | null = null
  for (const d of candidates) {
    if (ineligible(d, p)) continue
    if (d.max_uses_per_patient != null) {
      const used = await DiscountRepository.countUserRedemptions(d.id, p.userId)
      if (used >= d.max_uses_per_patient) continue
    }
    const applied = toApplied(d, p)
    // candidates viene ordenado por created_at DESC → en empate gana el más reciente
    if (!best || applied.expectedAmount < best.expectedAmount) best = applied
  }
  return best
}
