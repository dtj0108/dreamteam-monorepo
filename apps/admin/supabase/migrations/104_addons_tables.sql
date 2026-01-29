-- Add-ons Tables Migration
-- Creates tables for SMS credits, call minutes, and phone billing

-- ============================================
-- SMS CREDITS
-- ============================================

-- Workspace SMS credits balance
CREATE TABLE IF NOT EXISTS workspace_sms_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE,

    -- Balance tracking
    balance INTEGER NOT NULL DEFAULT 0,
    lifetime_credits INTEGER NOT NULL DEFAULT 0,
    lifetime_used INTEGER NOT NULL DEFAULT 0,

    -- Auto-replenish settings
    auto_replenish_enabled BOOLEAN NOT NULL DEFAULT false,
    auto_replenish_threshold INTEGER NOT NULL DEFAULT 50,
    auto_replenish_bundle TEXT CHECK (auto_replenish_bundle IN ('starter', 'growth', 'pro')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- SMS credit purchases
CREATE TABLE IF NOT EXISTS sms_credit_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

    bundle_type TEXT NOT NULL CHECK (bundle_type IN ('starter', 'growth', 'pro')),
    credits_amount INTEGER NOT NULL,
    price_cents INTEGER NOT NULL,

    -- Stripe references
    stripe_payment_intent_id TEXT,
    stripe_checkout_session_id TEXT,

    -- Status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    completed_at TIMESTAMPTZ,
    is_auto_replenish BOOLEAN NOT NULL DEFAULT false,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- SMS usage log
CREATE TABLE IF NOT EXISTS sms_usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

    message_sid TEXT NOT NULL UNIQUE,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    segments INTEGER NOT NULL DEFAULT 1,
    credits_consumed INTEGER NOT NULL DEFAULT 1,
    is_mms BOOLEAN NOT NULL DEFAULT false,
    from_number TEXT NOT NULL,
    to_number TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- CALL MINUTES
-- ============================================

-- Workspace call minutes balance
CREATE TABLE IF NOT EXISTS workspace_call_minutes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE,

    -- Balance tracking (stored in seconds for precision)
    balance_seconds INTEGER NOT NULL DEFAULT 0,
    lifetime_seconds INTEGER NOT NULL DEFAULT 0,
    lifetime_used_seconds INTEGER NOT NULL DEFAULT 0,

    -- Auto-replenish settings
    auto_replenish_enabled BOOLEAN NOT NULL DEFAULT false,
    auto_replenish_threshold INTEGER NOT NULL DEFAULT 10, -- In minutes
    auto_replenish_bundle TEXT CHECK (auto_replenish_bundle IN ('starter', 'growth', 'pro')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Call minutes purchases
CREATE TABLE IF NOT EXISTS call_minutes_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

    bundle_type TEXT NOT NULL CHECK (bundle_type IN ('starter', 'growth', 'pro')),
    minutes_amount INTEGER NOT NULL,
    price_cents INTEGER NOT NULL,

    -- Stripe references
    stripe_payment_intent_id TEXT,
    stripe_checkout_session_id TEXT,

    -- Status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    completed_at TIMESTAMPTZ,
    is_auto_replenish BOOLEAN NOT NULL DEFAULT false,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Call usage log
CREATE TABLE IF NOT EXISTS call_usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

    call_sid TEXT NOT NULL UNIQUE,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    minutes_consumed INTEGER NOT NULL DEFAULT 0,
    from_number TEXT NOT NULL,
    to_number TEXT NOT NULL,
    status TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- PHONE NUMBER SUBSCRIPTIONS
-- ============================================

CREATE TABLE IF NOT EXISTS phone_number_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE,

    stripe_subscription_id TEXT,
    stripe_subscription_item_id TEXT,

    -- Counts
    total_numbers INTEGER NOT NULL DEFAULT 0,
    local_numbers INTEGER NOT NULL DEFAULT 0,
    toll_free_numbers INTEGER NOT NULL DEFAULT 0,

    -- Billing
    monthly_total_cents INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'pending', 'past_due')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_sms_credits_workspace ON workspace_sms_credits(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sms_purchases_workspace ON sms_credit_purchases(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sms_purchases_session ON sms_credit_purchases(stripe_checkout_session_id) WHERE stripe_checkout_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sms_usage_workspace ON sms_usage_log(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sms_usage_created ON sms_usage_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_call_minutes_workspace ON workspace_call_minutes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_call_purchases_workspace ON call_minutes_purchases(workspace_id);
CREATE INDEX IF NOT EXISTS idx_call_purchases_session ON call_minutes_purchases(stripe_checkout_session_id) WHERE stripe_checkout_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_call_usage_workspace ON call_usage_log(workspace_id);
CREATE INDEX IF NOT EXISTS idx_call_usage_created ON call_usage_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_phone_subs_workspace ON phone_number_subscriptions(workspace_id);

-- ============================================
-- TRIGGERS FOR updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_addons_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS workspace_sms_credits_updated_at ON workspace_sms_credits;
CREATE TRIGGER workspace_sms_credits_updated_at
    BEFORE UPDATE ON workspace_sms_credits
    FOR EACH ROW
    EXECUTE FUNCTION update_addons_updated_at();

DROP TRIGGER IF EXISTS workspace_call_minutes_updated_at ON workspace_call_minutes;
CREATE TRIGGER workspace_call_minutes_updated_at
    BEFORE UPDATE ON workspace_call_minutes
    FOR EACH ROW
    EXECUTE FUNCTION update_addons_updated_at();

DROP TRIGGER IF EXISTS phone_number_subscriptions_updated_at ON phone_number_subscriptions;
CREATE TRIGGER phone_number_subscriptions_updated_at
    BEFORE UPDATE ON phone_number_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_addons_updated_at();

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE workspace_sms_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_credit_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_call_minutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_minutes_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_number_subscriptions ENABLE ROW LEVEL SECURITY;

-- Workspace members can view their workspace's data
CREATE POLICY "Workspace members can view SMS credits"
    ON workspace_sms_credits FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE profile_id = auth.uid()
        )
    );

CREATE POLICY "Workspace members can view SMS purchases"
    ON sms_credit_purchases FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE profile_id = auth.uid()
        )
    );

CREATE POLICY "Workspace members can view SMS usage"
    ON sms_usage_log FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE profile_id = auth.uid()
        )
    );

CREATE POLICY "Workspace members can view call minutes"
    ON workspace_call_minutes FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE profile_id = auth.uid()
        )
    );

CREATE POLICY "Workspace members can view call purchases"
    ON call_minutes_purchases FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE profile_id = auth.uid()
        )
    );

CREATE POLICY "Workspace members can view call usage"
    ON call_usage_log FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE profile_id = auth.uid()
        )
    );

CREATE POLICY "Workspace members can view phone subscriptions"
    ON phone_number_subscriptions FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE profile_id = auth.uid()
        )
    );

-- ============================================
-- HELPER FUNCTION: Safe credit addition
-- ============================================

CREATE OR REPLACE FUNCTION add_sms_credits_safe(
    p_workspace_id UUID,
    p_amount INTEGER
)
RETURNS void AS $$
BEGIN
    -- Insert if not exists, or update if exists
    INSERT INTO workspace_sms_credits (workspace_id, balance, lifetime_credits)
    VALUES (p_workspace_id, p_amount, p_amount)
    ON CONFLICT (workspace_id) DO UPDATE SET
        balance = workspace_sms_credits.balance + p_amount,
        lifetime_credits = workspace_sms_credits.lifetime_credits + p_amount,
        updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- HELPER FUNCTION: Deduct SMS credits atomically
-- ============================================

CREATE OR REPLACE FUNCTION deduct_sms_credits(
    p_workspace_id UUID,
    p_amount INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_balance INTEGER;
BEGIN
    -- Get current balance with lock
    SELECT balance INTO v_current_balance
    FROM workspace_sms_credits
    WHERE workspace_id = p_workspace_id
    FOR UPDATE;

    -- Check if sufficient balance
    IF v_current_balance IS NULL OR v_current_balance < p_amount THEN
        RETURN FALSE;
    END IF;

    -- Deduct
    UPDATE workspace_sms_credits
    SET
        balance = balance - p_amount,
        lifetime_used = lifetime_used + p_amount,
        updated_at = now()
    WHERE workspace_id = p_workspace_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- HELPER FUNCTION: Deduct call minutes atomically
-- ============================================

CREATE OR REPLACE FUNCTION deduct_call_minutes(
    p_workspace_id UUID,
    p_seconds INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_balance INTEGER;
BEGIN
    -- Get current balance with lock
    SELECT balance_seconds INTO v_current_balance
    FROM workspace_call_minutes
    WHERE workspace_id = p_workspace_id
    FOR UPDATE;

    -- Check if sufficient balance
    IF v_current_balance IS NULL OR v_current_balance < p_seconds THEN
        RETURN FALSE;
    END IF;

    -- Deduct
    UPDATE workspace_call_minutes
    SET
        balance_seconds = balance_seconds - p_seconds,
        lifetime_used_seconds = lifetime_used_seconds + p_seconds,
        updated_at = now()
    WHERE workspace_id = p_workspace_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- INITIALIZE: Create records for existing workspaces
-- ============================================

-- Create SMS credits records for workspaces that don't have them
INSERT INTO workspace_sms_credits (workspace_id, balance, lifetime_credits, lifetime_used)
SELECT id, 0, 0, 0
FROM workspaces
WHERE id NOT IN (SELECT workspace_id FROM workspace_sms_credits)
ON CONFLICT DO NOTHING;

-- Create call minutes records for workspaces that don't have them
INSERT INTO workspace_call_minutes (workspace_id, balance_seconds, lifetime_seconds, lifetime_used_seconds)
SELECT id, 0, 0, 0
FROM workspaces
WHERE id NOT IN (SELECT workspace_id FROM workspace_call_minutes)
ON CONFLICT DO NOTHING;

-- Create phone subscription records for workspaces that don't have them
INSERT INTO phone_number_subscriptions (workspace_id, total_numbers, local_numbers, toll_free_numbers, monthly_total_cents)
SELECT id, 0, 0, 0, 0
FROM workspaces
WHERE id NOT IN (SELECT workspace_id FROM phone_number_subscriptions)
ON CONFLICT DO NOTHING;

COMMENT ON TABLE workspace_sms_credits IS 'SMS credit balance and auto-replenish settings per workspace';
COMMENT ON TABLE sms_credit_purchases IS 'SMS credit purchase history';
COMMENT ON TABLE sms_usage_log IS 'SMS usage tracking for billing';
COMMENT ON TABLE workspace_call_minutes IS 'Call minutes balance and auto-replenish settings per workspace';
COMMENT ON TABLE call_minutes_purchases IS 'Call minutes purchase history';
COMMENT ON TABLE call_usage_log IS 'Call usage tracking for billing';
COMMENT ON TABLE phone_number_subscriptions IS 'Phone number subscription tracking per workspace';
