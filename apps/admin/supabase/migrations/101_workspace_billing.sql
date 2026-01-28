-- Workspace Billing Tables
-- Links workspaces to Stripe subscriptions and tracks billing state

-- 1. workspace_billing - Links workspace to Stripe subscription
CREATE TABLE IF NOT EXISTS workspace_billing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE,

    -- Stripe identifiers
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    stripe_agent_subscription_id TEXT,

    -- Workspace plan (core product)
    plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'monthly', 'annual')),
    plan_status TEXT CHECK (plan_status IN ('trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused')),
    plan_period_start TIMESTAMPTZ,
    plan_period_end TIMESTAMPTZ,
    plan_cancel_at_period_end BOOLEAN DEFAULT false,

    -- Agent tier (add-on subscription)
    agent_tier TEXT NOT NULL DEFAULT 'none' CHECK (agent_tier IN ('none', 'startup', 'teams', 'enterprise')),
    agent_status TEXT CHECK (agent_status IN ('trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused')),
    agent_period_end TIMESTAMPTZ,

    -- Trial tracking
    trial_start TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,

    -- Usage limits based on plan
    included_users INTEGER NOT NULL DEFAULT 3,
    current_user_count INTEGER NOT NULL DEFAULT 1,
    storage_limit_gb INTEGER NOT NULL DEFAULT 1,
    storage_used_gb NUMERIC(10, 2) NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for quick Stripe customer lookup
CREATE INDEX IF NOT EXISTS idx_workspace_billing_stripe_customer ON workspace_billing(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_workspace_billing_stripe_subscription ON workspace_billing(stripe_subscription_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_workspace_billing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS workspace_billing_updated_at ON workspace_billing;
CREATE TRIGGER workspace_billing_updated_at
    BEFORE UPDATE ON workspace_billing
    FOR EACH ROW
    EXECUTE FUNCTION update_workspace_billing_updated_at();


-- 2. billing_invoices - Invoice records from Stripe
CREATE TABLE IF NOT EXISTS billing_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

    -- Stripe identifiers
    stripe_invoice_id TEXT NOT NULL UNIQUE,
    stripe_payment_intent_id TEXT,

    -- Invoice details
    amount_due INTEGER NOT NULL DEFAULT 0,
    amount_paid INTEGER NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'usd',
    status TEXT NOT NULL DEFAULT 'draft',
    description TEXT,

    -- URLs for viewing/downloading
    invoice_url TEXT,
    invoice_pdf TEXT,

    -- Billing period
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for workspace invoice lookup
CREATE INDEX IF NOT EXISTS idx_billing_invoices_workspace ON billing_invoices(workspace_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_stripe_id ON billing_invoices(stripe_invoice_id);


-- 3. billing_checkout_sessions - Track checkout sessions (including guest checkout)
CREATE TABLE IF NOT EXISTS billing_checkout_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE, -- Nullable for guest checkout

    -- Stripe session tracking
    stripe_session_id TEXT NOT NULL UNIQUE,
    session_type TEXT NOT NULL CHECK (session_type IN ('workspace_plan', 'agent_tier')),
    target_plan TEXT NOT NULL, -- 'monthly', 'annual', 'startup', 'teams', 'enterprise'

    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired', 'failed')),
    completed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for session lookup
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_stripe_id ON billing_checkout_sessions(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_workspace ON billing_checkout_sessions(workspace_id);


-- 4. Trigger to auto-create billing record when workspace is created
CREATE OR REPLACE FUNCTION on_workspace_created_billing()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO workspace_billing (workspace_id, plan, agent_tier, included_users, storage_limit_gb)
    VALUES (NEW.id, 'free', 'none', 3, 1)
    ON CONFLICT (workspace_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS workspace_billing_on_create ON workspaces;
CREATE TRIGGER workspace_billing_on_create
    AFTER INSERT ON workspaces
    FOR EACH ROW
    EXECUTE FUNCTION on_workspace_created_billing();


-- 5. Backfill billing records for existing workspaces
INSERT INTO workspace_billing (workspace_id, plan, agent_tier, included_users, storage_limit_gb)
SELECT id, 'free', 'none', 3, 1
FROM workspaces
WHERE id NOT IN (SELECT workspace_id FROM workspace_billing)
ON CONFLICT (workspace_id) DO NOTHING;


-- 6. RLS Policies

-- Enable RLS on all billing tables
ALTER TABLE workspace_billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_checkout_sessions ENABLE ROW LEVEL SECURITY;

-- workspace_billing: Only workspace owner can view/modify
CREATE POLICY "Workspace owners can view billing"
    ON workspace_billing FOR SELECT
    USING (
        workspace_id IN (
            SELECT id FROM workspaces WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Workspace owners can update billing"
    ON workspace_billing FOR UPDATE
    USING (
        workspace_id IN (
            SELECT id FROM workspaces WHERE owner_id = auth.uid()
        )
    );

-- billing_invoices: Workspace owner can view invoices
CREATE POLICY "Workspace owners can view invoices"
    ON billing_invoices FOR SELECT
    USING (
        workspace_id IN (
            SELECT id FROM workspaces WHERE owner_id = auth.uid()
        )
    );

-- billing_checkout_sessions: Workspace owner can view their sessions
CREATE POLICY "Workspace owners can view checkout sessions"
    ON billing_checkout_sessions FOR SELECT
    USING (
        workspace_id IN (
            SELECT id FROM workspaces WHERE owner_id = auth.uid()
        )
        OR workspace_id IS NULL -- Allow viewing guest sessions before linking
    );

CREATE POLICY "Workspace owners can update checkout sessions"
    ON billing_checkout_sessions FOR UPDATE
    USING (
        workspace_id IN (
            SELECT id FROM workspaces WHERE owner_id = auth.uid()
        )
        OR workspace_id IS NULL
    );

-- Service role bypass for webhook operations (implicit with SECURITY DEFINER functions)

COMMENT ON TABLE workspace_billing IS 'Links workspaces to Stripe subscriptions and tracks billing state';
COMMENT ON TABLE billing_invoices IS 'Invoice records synced from Stripe';
COMMENT ON TABLE billing_checkout_sessions IS 'Tracks Stripe checkout sessions for workspace and agent tier purchases';
