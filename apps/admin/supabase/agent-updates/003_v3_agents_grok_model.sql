-- ==========================================
-- Update V3 Agents to use xAI Grok 4 Fast
-- ==========================================

-- Step 1: Drop the existing model constraint
ALTER TABLE ai_agents DROP CONSTRAINT IF EXISTS ai_agents_model_check;

-- Step 2: Add new constraint that includes grok models
ALTER TABLE ai_agents ADD CONSTRAINT ai_agents_model_check
  CHECK (model IN ('sonnet', 'opus', 'haiku', 'grok-3', 'grok-4-fast'));

-- Step 3: Update all V3 agents to use grok-4-fast
UPDATE ai_agents
SET model = 'grok-4-fast', updated_at = NOW()
WHERE product_line = 'v3';

-- Verification
SELECT name, model, product_line FROM ai_agents WHERE product_line = 'v3';
