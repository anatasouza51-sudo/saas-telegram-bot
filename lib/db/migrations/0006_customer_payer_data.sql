-- Add mandatory payer fields for Oasy.fy and other gateways that require
-- real customer identification. These fields are stored per-tenant and
-- protected by the existing RLS policies.

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS "email" text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS "phone" text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS "document" text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS "paymentDataState" text;

-- These columns are intentionally nullable because existing customers
-- may not have them, and the bot will collect them only when needed
-- for a specific gateway or purchase flow.
