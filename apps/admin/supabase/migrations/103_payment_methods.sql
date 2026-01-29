-- Payment Methods Migration
-- Enables card-on-file payments for SMS credits and call minutes

-- 1. Add payment method columns to workspace_billing
ALTER TABLE workspace_billing
    ADD COLUMN IF NOT EXISTS default_payment_method_id TEXT,
    ADD COLUMN IF NOT EXISTS payment_method_last4 TEXT,
    ADD COLUMN IF NOT EXISTS payment_method_brand TEXT,
    ADD COLUMN IF NOT EXISTS payment_method_exp_month INTEGER,
    ADD COLUMN IF NOT EXISTS payment_method_exp_year INTEGER,
    ADD COLUMN IF NOT EXISTS payment_method_updated_at TIMESTAMPTZ;

-- Index for payment method lookup
CREATE INDEX IF NOT EXISTS idx_workspace_billing_payment_method ON workspace_billing(default_payment_method_id) WHERE default_payment_method_id IS NOT NULL;

-- 2. Create auto_replenish_attempts table to track auto-replenish charge attempts
CREATE TABLE IF NOT EXISTS auto_replenish_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

    -- What was being replenished
    replenish_type TEXT NOT NULL CHECK (replenish_type IN ('sms_credits', 'call_minutes')),
    bundle TEXT NOT NULL, -- 'starter', 'growth', 'pro'

    -- Charge details
    amount_cents INTEGER NOT NULL,
    credits_or_minutes INTEGER NOT NULL, -- Credits for SMS, seconds for call minutes

    -- Stripe references
    stripe_payment_intent_id TEXT,
    stripe_charge_id TEXT,

    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'requires_action')),
    error_code TEXT,
    error_message TEXT,

    -- Result
    succeeded_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for auto_replenish_attempts
CREATE INDEX IF NOT EXISTS idx_auto_replenish_workspace ON auto_replenish_attempts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_auto_replenish_status ON auto_replenish_attempts(status);
CREATE INDEX IF NOT EXISTS idx_auto_replenish_created ON auto_replenish_attempts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auto_replenish_stripe_pi ON auto_replenish_attempts(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;

-- Updated_at trigger for auto_replenish_attempts
CREATE OR REPLACE FUNCTION update_auto_replenish_attempts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_replenish_attempts_updated_at ON auto_replenish_attempts;
CREATE TRIGGER auto_replenish_attempts_updated_at
    BEFORE UPDATE ON auto_replenish_attempts
    FOR EACH ROW
    EXECUTE FUNCTION update_auto_replenish_attempts_updated_at();

-- 3. RLS Policies for auto_replenish_attempts
ALTER TABLE auto_replenish_attempts ENABLE ROW LEVEL SECURITY;

-- Workspace owners can view their auto-replenish attempts
CREATE POLICY "Workspace owners can view auto replenish attempts"
    ON auto_replenish_attempts FOR SELECT
    USING (
        workspace_id IN (
            SELECT id FROM workspaces WHERE owner_id = auth.uid()
        )
    );

-- Only service role can insert/update (via webhooks and cron)
-- No insert/update policies for regular users

COMMENT ON TABLE auto_replenish_attempts IS 'Tracks auto-replenish charge attempts for SMS credits and call minutes';
COMMENT ON COLUMN workspace_billing.default_payment_method_id IS 'Stripe PaymentMethod ID for card-on-file payments';
COMMENT ON COLUMN workspace_billing.payment_method_last4 IS 'Last 4 digits of saved card for display';
COMMENT ON COLUMN workspace_billing.payment_method_brand IS 'Card brand (visa, mastercard, amex, etc.)';
