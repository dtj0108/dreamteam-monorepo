-- DreamTeam V4: Add 'v4' to product_line constraint
-- This enables the enterprise tier ($10K/month) with 38 specialized agents

-- Update the product_line CHECK constraint to include 'v4'
ALTER TABLE ai_agents DROP CONSTRAINT IF EXISTS ai_agents_product_line_check;
ALTER TABLE ai_agents ADD CONSTRAINT ai_agents_product_line_check
  CHECK (product_line IN ('v2', 'v3', 'v4'));

-- Verify the constraint was updated
DO $$
BEGIN
  RAISE NOTICE 'product_line constraint updated to include v4';
END $$;
