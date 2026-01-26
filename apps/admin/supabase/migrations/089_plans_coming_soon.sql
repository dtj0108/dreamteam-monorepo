-- 089_plans_coming_soon.sql
-- Add coming soon functionality and plan types for pricing page

-- ============================================
-- 1. PLAN TYPE ENUM
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plan_type_enum') THEN
    CREATE TYPE plan_type_enum AS ENUM ('workspace_plan', 'agent_tier');
  END IF;
END $$;

-- ============================================
-- 2. ADD NEW COLUMNS TO PLANS TABLE
-- ============================================
DO $$
BEGIN
  -- Coming soon flag (visible but not purchasable)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'is_coming_soon') THEN
    ALTER TABLE plans ADD COLUMN is_coming_soon BOOLEAN DEFAULT false;
  END IF;

  -- Plan type to distinguish workspace plans from agent tiers
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'plan_type') THEN
    ALTER TABLE plans ADD COLUMN plan_type plan_type_enum;
  END IF;

  -- Display config for UI metadata (tagline, badge, agent count, etc.)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'display_config') THEN
    ALTER TABLE plans ADD COLUMN display_config JSONB DEFAULT '{}';
  END IF;
END $$;

-- ============================================
-- 3. INDEXES FOR PUBLIC QUERIES
-- ============================================
-- Index for fetching active plans by type (used by public pricing API)
CREATE INDEX IF NOT EXISTS idx_plans_public ON plans(is_active, plan_type) WHERE is_active = true;

-- Index for coming soon filter
CREATE INDEX IF NOT EXISTS idx_plans_coming_soon ON plans(is_coming_soon) WHERE is_coming_soon = true;

-- ============================================
-- 4. COMMENTS
-- ============================================
COMMENT ON COLUMN plans.is_coming_soon IS 'When true, plan is visible on pricing page but cannot be purchased';
COMMENT ON COLUMN plans.plan_type IS 'Type of plan: workspace_plan for team subscriptions, agent_tier for AI agent packages';
COMMENT ON COLUMN plans.display_config IS 'JSON config for UI display: tagline, badge_text, human_equivalent, agent_count, savings_text, departments, etc.';

-- ============================================
-- 5. STATE LOGIC DOCUMENTATION
-- ============================================
-- is_active = false               → Plan hidden entirely
-- is_active = true, is_coming_soon = false → Plan purchasable
-- is_active = true, is_coming_soon = true  → Plan visible but disabled (Coming Soon badge)
