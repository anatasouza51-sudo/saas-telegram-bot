-- Oasy.fy requires a payer name with at least three characters.
-- Store only the encrypted value; the column is optional for legacy customers.
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS "payerName" text;

COMMENT ON COLUMN public.customers."payerName" IS
  'Encrypted legal/display payer name used only for payment gateways';

-- RLS is already enabled and enforced for public.customers by 0003_rls_tenant_isolation.sql.
