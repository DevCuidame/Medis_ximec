export type DiscountKind = 'percentage' | 'two_for_one'

// ─── DB row shape ─────────────────────────────────────────────────────────────
export interface DiscountRecord {
  id:                   string
  name:                 string
  kind:                 DiscountKind
  value:                number | null
  code:                 string | null
  specialty:            string | null
  starts_at:            Date | null
  ends_at:              Date | null
  max_uses_total:       number | null
  max_uses_per_patient: number | null
  uses_count:           number
  is_active:            boolean
  created_at:           Date
  updated_at:           Date
}

// ─── API response shape ───────────────────────────────────────────────────────
export interface DiscountPublic {
  id:                string
  name:              string
  kind:              DiscountKind
  value:             number | null
  code:              string | null
  specialty:         string | null
  startsAt:          string | null
  endsAt:            string | null
  maxUsesTotal:      number | null
  maxUsesPerPatient: number | null
  usesCount:         number
  isActive:          boolean
  createdAt:         string
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────
export interface CreateDiscountDTO {
  name:               string
  kind:               DiscountKind
  value?:             number
  code?:              string
  specialty?:         string
  startsAt?:          string
  endsAt?:            string
  maxUsesTotal?:      number
  maxUsesPerPatient?: number
}

export interface UpdateDiscountDTO extends Partial<CreateDiscountDTO> {
  isActive?: boolean
}

// ─── Aplicación en reservas ───────────────────────────────────────────────────
export interface AppliedDiscount {
  discountId:     string
  name:           string
  kind:           DiscountKind
  expectedAmount: number
  discountPct:    number
}
