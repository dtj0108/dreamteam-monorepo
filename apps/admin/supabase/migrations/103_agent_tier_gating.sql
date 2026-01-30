-- ==========================================
-- Agent Tier Gating Schema
-- ==========================================
-- Adds tier_required and product_line columns to ai_agents table
-- to support V2 (startup tier) and V3 (teams tier) agent separation

-- Add tier_required column - which minimum tier is needed to access this agent
ALTER TABLE ai_agents
ADD COLUMN IF NOT EXISTS tier_required TEXT DEFAULT 'startup'
  CHECK (tier_required IN ('startup', 'teams', 'enterprise'));

-- Add product_line column - which product line this agent belongs to
ALTER TABLE ai_agents
ADD COLUMN IF NOT EXISTS product_line TEXT DEFAULT 'v2'
  CHECK (product_line IN ('v2', 'v3'));

-- Create index for efficient tier filtering
CREATE INDEX IF NOT EXISTS idx_ai_agents_tier_required ON ai_agents(tier_required);
CREATE INDEX IF NOT EXISTS idx_ai_agents_product_line ON ai_agents(product_line);

-- Update existing V2 agents to have explicit tier_required and product_line
UPDATE ai_agents
SET
  tier_required = 'startup',
  product_line = 'v2'
WHERE name IN (
  'Co-Founder Agent',
  'Finance Agent',
  'Operations Agent',
  'Sales Agent',
  'Marketing Agent',
  'Performance Agent',
  'Systems Agent'
);

-- Add helpful comments
COMMENT ON COLUMN ai_agents.tier_required IS 'Minimum agent tier required to access this agent: startup, teams, or enterprise';
COMMENT ON COLUMN ai_agents.product_line IS 'Product line this agent belongs to: v2 (Lean Startup) or v3 (Teams)';
