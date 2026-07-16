import { pool } from '@config/database.js'
import type { DiscountRecord, DiscountPublic, CreateDiscountDTO, UpdateDiscountDTO } from '../types/discount.types.js'

function toPublic(r: DiscountRecord): DiscountPublic {
  return {
    id:                r.id,
    name:              r.name,
    kind:              r.kind,
    value:             r.value,
    code:              r.code,
    specialty:         r.specialty,
    startsAt:          r.starts_at ? new Date(r.starts_at).toISOString().slice(0, 10) : null,
    endsAt:            r.ends_at ? new Date(r.ends_at).toISOString().slice(0, 10) : null,
    maxUsesTotal:      r.max_uses_total,
    maxUsesPerPatient: r.max_uses_per_patient,
    usesCount:         r.uses_count,
    isActive:          r.is_active,
    createdAt:         r.created_at.toISOString(),
  }
}

const RETURNING = `RETURNING *`

export const DiscountRepository = {
  async list(): Promise<DiscountPublic[]> {
    const { rows } = await pool.query<DiscountRecord>(
      `SELECT * FROM discounts ORDER BY created_at DESC`
    )
    return rows.map(toPublic)
  },

  async findById(id: string): Promise<DiscountRecord | null> {
    const { rows } = await pool.query<DiscountRecord>(
      `SELECT * FROM discounts WHERE id = $1 LIMIT 1`, [id]
    )
    return rows[0] ?? null
  },

  async findByCode(code: string): Promise<DiscountRecord | null> {
    const { rows } = await pool.query<DiscountRecord>(
      `SELECT * FROM discounts WHERE code = $1 LIMIT 1`, [code]
    )
    return rows[0] ?? null
  },

  /** Descuentos automáticos (sin código) candidatos: activos y sin código. El resto de la elegibilidad se evalúa en el servicio. */
  async findAutomaticCandidates(): Promise<DiscountRecord[]> {
    const { rows } = await pool.query<DiscountRecord>(
      `SELECT * FROM discounts WHERE code IS NULL AND is_active = TRUE ORDER BY created_at DESC`
    )
    return rows
  },

  async countUserRedemptions(discountId: string, userId: string): Promise<number> {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS n FROM discount_redemptions WHERE discount_id = $1 AND user_id = $2`,
      [discountId, userId]
    )
    return rows[0].n
  },

  /** Registra la redención e incrementa uses_count en una sola transacción. */
  async redeem(discountId: string, userId: string, bookingRequestId: string | null): Promise<void> {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(
        `INSERT INTO discount_redemptions (discount_id, user_id, booking_request_id) VALUES ($1, $2, $3)`,
        [discountId, userId, bookingRequestId]
      )
      await client.query(
        `UPDATE discounts SET uses_count = uses_count + 1 WHERE id = $1`,
        [discountId]
      )
      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  },

  async create(dto: CreateDiscountDTO & { code: string | null; value: number | null }): Promise<DiscountPublic> {
    const { rows } = await pool.query<DiscountRecord>(
      `INSERT INTO discounts (name, kind, value, code, specialty, starts_at, ends_at, max_uses_total, max_uses_per_patient)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ${RETURNING}`,
      [
        dto.name.trim(),
        dto.kind,
        dto.value,
        dto.code,
        dto.specialty?.trim() || null,
        dto.startsAt ?? null,
        dto.endsAt ?? null,
        dto.maxUsesTotal ?? null,
        dto.maxUsesPerPatient ?? null,
      ]
    )
    return toPublic(rows[0])
  },

  async update(id: string, dto: UpdateDiscountDTO & { code?: string | null; value?: number | null }): Promise<DiscountPublic | null> {
    const sets: string[] = []
    const values: unknown[] = []
    let i = 1

    if (dto.name !== undefined)              { sets.push(`name = $${i++}`);                 values.push(dto.name.trim()) }
    if (dto.kind !== undefined)              { sets.push(`kind = $${i++}`);                 values.push(dto.kind) }
    if (dto.value !== undefined)             { sets.push(`value = $${i++}`);                values.push(dto.value) }
    if (dto.code !== undefined)              { sets.push(`code = $${i++}`);                 values.push(dto.code) }
    if (dto.specialty !== undefined)         { sets.push(`specialty = $${i++}`);            values.push(dto.specialty?.trim() || null) }
    if (dto.startsAt !== undefined)          { sets.push(`starts_at = $${i++}`);            values.push(dto.startsAt || null) }
    if (dto.endsAt !== undefined)            { sets.push(`ends_at = $${i++}`);              values.push(dto.endsAt || null) }
    if (dto.maxUsesTotal !== undefined)      { sets.push(`max_uses_total = $${i++}`);       values.push(dto.maxUsesTotal ?? null) }
    if (dto.maxUsesPerPatient !== undefined) { sets.push(`max_uses_per_patient = $${i++}`); values.push(dto.maxUsesPerPatient ?? null) }
    if (dto.isActive !== undefined)          { sets.push(`is_active = $${i++}`);            values.push(dto.isActive) }
    if (sets.length === 0) {
      const row = await this.findById(id)
      return row ? toPublic(row) : null
    }

    values.push(id)
    const { rows } = await pool.query<DiscountRecord>(
      `UPDATE discounts SET ${sets.join(', ')} WHERE id = $${i} ${RETURNING}`,
      values
    )
    return rows[0] ? toPublic(rows[0]) : null
  },

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await pool.query(`DELETE FROM discounts WHERE id = $1`, [id])
    return (rowCount ?? 0) > 0
  },
}
