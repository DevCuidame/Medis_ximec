import type { Request, Response } from 'express'
import { DiscountRepository } from '@repositories/discount.repository.js'
import { validateDiscountDTO } from '@services/discount.service.js'

export async function listDiscounts(_req: Request, res: Response): Promise<void> {
  try {
    const discounts = await DiscountRepository.list()
    res.json({ success: true, data: { discounts } })
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ success: false, error: err.message })
  }
}

export async function createDiscount(req: Request, res: Response): Promise<void> {
  try {
    const { value, code } = validateDiscountDTO(req.body)
    const discount = await DiscountRepository.create({ ...req.body, value, code })
    res.status(201).json({ success: true, data: { discount } })
  } catch (err: any) {
    if (err.code === '23505') { res.status(409).json({ success: false, error: 'Ese código ya existe.' }); return }
    res.status(err.statusCode ?? 500).json({ success: false, error: err.message })
  }
}

export async function updateDiscount(req: Request, res: Response): Promise<void> {
  try {
    let normalized: { value?: number | null; code?: string | null } = {}
    // Solo re-validar el conjunto si cambian campos de contenido (no un simple toggle de isActive)
    if (req.body.name !== undefined || req.body.kind !== undefined || req.body.value !== undefined || req.body.code !== undefined || req.body.startsAt !== undefined || req.body.endsAt !== undefined || req.body.maxUsesTotal !== undefined || req.body.maxUsesPerPatient !== undefined) {
      const existing = await DiscountRepository.findById(req.params.id)
      if (!existing) { res.status(404).json({ success: false, error: 'Descuento no encontrado.' }); return }
      const merged = {
        name: req.body.name ?? existing.name,
        kind: req.body.kind ?? existing.kind,
        value: req.body.value ?? existing.value ?? undefined,
        code: req.body.code !== undefined ? req.body.code : existing.code ?? undefined,
        specialty: req.body.specialty !== undefined ? req.body.specialty : existing.specialty ?? undefined,
        startsAt: req.body.startsAt !== undefined ? req.body.startsAt : (existing.starts_at ? new Date(existing.starts_at).toISOString().slice(0, 10) : undefined),
        endsAt: req.body.endsAt !== undefined ? req.body.endsAt : (existing.ends_at ? new Date(existing.ends_at).toISOString().slice(0, 10) : undefined),
        maxUsesTotal: req.body.maxUsesTotal !== undefined ? req.body.maxUsesTotal : existing.max_uses_total ?? undefined,
        maxUsesPerPatient: req.body.maxUsesPerPatient !== undefined ? req.body.maxUsesPerPatient : existing.max_uses_per_patient ?? undefined,
      }
      normalized = validateDiscountDTO(merged as any)
    }
    const discount = await DiscountRepository.update(req.params.id, { ...req.body, ...normalized })
    if (!discount) { res.status(404).json({ success: false, error: 'Descuento no encontrado.' }); return }
    res.json({ success: true, data: { discount } })
  } catch (err: any) {
    if (err.code === '23505') { res.status(409).json({ success: false, error: 'Ese código ya existe.' }); return }
    res.status(err.statusCode ?? 500).json({ success: false, error: err.message })
  }
}

export async function deleteDiscount(req: Request, res: Response): Promise<void> {
  try {
    const deleted = await DiscountRepository.delete(req.params.id)
    if (!deleted) { res.status(404).json({ success: false, error: 'Descuento no encontrado.' }); return }
    res.json({ success: true, data: null })
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ success: false, error: err.message })
  }
}
