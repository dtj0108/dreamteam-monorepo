-- Billing Events Analytics System
-- Centralized event log for all billing activity

-- 1. billing_events - Main event log table
CREATE TABLE IF NOT EXISTS billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Event classification
  event_type TEXT NOT NULL,  -- 'subscription.created', 'payment.failed', 'tier.upgraded', etc.
  event_category TEXT NOT NULL,  -- 'subscription', 'payment', 'tier', 'addon', 'trial'

  -- Event details
  event_data JSONB NOT NULL DEFAULT '{}',  -- Full event payload
  amount_cents INTEGER,  -- For monetary events
  currency TEXT DEFAULT 'usd',

  -- Stripe references
  stripe_event_id TEXT UNIQUE,  -- For deduplication
  stripe_object_id TEXT,  -- subscription_id, invoice_id, etc.

  -- Context
  source TEXT NOT NULL DEFAULT 'webhook',  -- 'webhook', 'api', 'admin', 'system'

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_billing_events_workspace ON billing_events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_type ON billing_events(event_type);
CREATE INDEX IF NOT EXISTS idx_billing_events_category ON billing_events(event_category);
CREATE INDEX IF NOT EXISTS idx_billing_events_created ON billing_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_events_stripe ON billing_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_source ON billing_events(source);

-- Composite index for common filter patterns
CREATE INDEX IF NOT EXISTS idx_billing_events_workspace_created ON billing_events(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_events_category_created ON billing_events(event_category, created_at DESC);


-- 2. billing_alerts - In-admin alerts for important billing events
CREATE TABLE IF NOT EXISTS billing_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  billing_event_id UUID REFERENCES billing_events(id) ON DELETE SET NULL,

  -- Alert classification
  alert_type TEXT NOT NULL,  -- 'payment_failed', 'trial_expiring', 'high_value_churn', 'unusual_activity'
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),

  -- Alert content
  title TEXT NOT NULL,
  description TEXT,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'acknowledged', 'resolved', 'dismissed')),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for alerts
CREATE INDEX IF NOT EXISTS idx_billing_alerts_workspace ON billing_alerts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_billing_alerts_status ON billing_alerts(status);
CREATE INDEX IF NOT EXISTS idx_billing_alerts_type ON billing_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_billing_alerts_severity ON billing_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_billing_alerts_created ON billing_alerts(created_at DESC);

-- Composite index for dashboard queries (new/unresolved alerts)
CREATE INDEX IF NOT EXISTS idx_billing_alerts_status_created ON billing_alerts(status, created_at DESC) WHERE status IN ('new', 'acknowledged');


-- 3. Enable RLS
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_alerts ENABLE ROW LEVEL SECURITY;

-- Service role has full access (admin operations, webhooks)
-- No user-facing policies needed since this is admin-only

-- Comments for documentation
COMMENT ON TABLE billing_events IS 'Centralized event log for all billing activity - analytics and audit trail';
COMMENT ON TABLE billing_alerts IS 'In-admin alerts for important billing events requiring attention';

COMMENT ON COLUMN billing_events.event_type IS 'Specific event type: subscription.created, payment.failed, tier.upgraded, etc.';
COMMENT ON COLUMN billing_events.event_category IS 'Category: subscription, payment, tier, addon, trial';
COMMENT ON COLUMN billing_events.source IS 'Event source: webhook (Stripe), api (user action), admin, system';
COMMENT ON COLUMN billing_events.stripe_event_id IS 'Unique Stripe event ID for deduplication';

COMMENT ON COLUMN billing_alerts.alert_type IS 'Type: payment_failed, trial_expiring, high_value_churn, unusual_activity';
COMMENT ON COLUMN billing_alerts.severity IS 'Severity level: low, medium, high, critical';
