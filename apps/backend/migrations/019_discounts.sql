-- ============================================================
-- Migration 019: Descuentos (porcentaje / 2x1) y redenciones
-- ============================================================

CREATE TABLE IF NOT EXISTS discounts (
  id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 VARCHAR(120) NOT NULL,
  kind                 VARCHAR(12)  NOT NULL CHECK (kind IN ('percentage', 'two_for_one')),
  value                INTEGER      CHECK (value BETWEEN 1 AND 100),
  code                 VARCHAR(40)  UNIQUE,
  specialty            VARCHAR(100),
  starts_at            DATE,
  ends_at              DATE,
  max_uses_total       INTEGER      CHECK (max_uses_total > 0),
  max_uses_per_patient INTEGER      CHECK (max_uses_per_patient > 0),
  uses_count           INTEGER      NOT NULL DEFAULT 0,
  is_active            BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_discounts_updated_at') THEN
    CREATE TRIGGER trg_discounts_updated_at
      BEFORE UPDATE ON discounts
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS discount_redemptions (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  discount_id        UUID        NOT NULL REFERENCES discounts(id) ON DELETE CASCADE,
  user_id            UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  booking_request_id UUID        REFERENCES booking_requests(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discount_redemptions_discount_user
  ON discount_redemptions (discount_id, user_id);
