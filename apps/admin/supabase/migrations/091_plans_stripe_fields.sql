-- Migration: Add Stripe price IDs to plans table
-- This enables the plans table to be the source of truth for Stripe integration

-- Add Stripe columns
ALTER TABLE plans ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS stripe_price_id_yearly TEXT;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS stripe_product_id TEXT;

-- Add comments for documentation
COMMENT ON COLUMN plans.stripe_price_id IS 'Stripe Price ID for monthly billing (e.g., price_xxx)';
COMMENT ON COLUMN plans.stripe_price_id_yearly IS 'Stripe Price ID for yearly billing (e.g., price_xxx)';
COMMENT ON COLUMN plans.stripe_product_id IS 'Stripe Product ID for this plan (e.g., prod_xxx)';

-- Index for efficient lookup by Stripe price ID
CREATE INDEX IF NOT EXISTS idx_plans_stripe_price ON plans(stripe_price_id) WHERE stripe_price_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_plans_stripe_price_yearly ON plans(stripe_price_id_yearly) WHERE stripe_price_id_yearly IS NOT NULL;
