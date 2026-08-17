-- Platform control-plane settings: no tenant owner_id by design.
-- Access is restricted to server-side admin capability checks.
CREATE TABLE IF NOT EXISTS platform_settings (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE platform_settings IS 'Global platform control-plane settings; never exposed to tenant users.';
COMMENT ON COLUMN platform_settings.value IS 'Sensitive values are encrypted at rest by the application layer.';

INSERT INTO platform_settings (key, value)
SELECT 'misticpay.commissionCents', '75'
WHERE NOT EXISTS (
  SELECT 1 FROM platform_settings WHERE key = 'misticpay.commissionCents'
);

INSERT INTO platform_settings (key, value)
SELECT 'misticpay.commissionPercent', '25'
WHERE NOT EXISTS (
  SELECT 1 FROM platform_settings WHERE key = 'misticpay.commissionPercent'
);

INSERT INTO platform_settings (key, value)
SELECT 'misticpay.enabled', 'false'
WHERE NOT EXISTS (
  SELECT 1 FROM platform_settings WHERE key = 'misticpay.enabled'
);
