-- ============================================================
-- Migration 021: Membership Services
-- Allows linking a membership to specific services and quantities.
-- ============================================================

CREATE TABLE IF NOT EXISTS membership_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id UUID NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES service_offers(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(membership_id, service_id)
);

-- Trigger: create only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_membership_services_updated_at') THEN
    CREATE TRIGGER trg_membership_services_updated_at
      BEFORE UPDATE ON membership_services
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END
$$;
