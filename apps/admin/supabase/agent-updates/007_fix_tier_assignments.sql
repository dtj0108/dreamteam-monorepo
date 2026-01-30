-- Fix Agent Tier Assignments for Exclusive Access
--
-- This migration ensures agents have correct tier_required values.
-- Each tier gets its OWN exclusive set of agents.
--
-- Exclusive Tier Model:
-- | Tier       | Gets Access To      | Agent Count |
-- |------------|---------------------|-------------|
-- | startup    | V2 agents only      | 7           |
-- | teams      | V3 agents only      | 18          |
-- | enterprise | V4 agents only      | 38          |
--
-- How Exclusive Access Works:
-- - tier_required = 'startup'    → Only Startup users can access
-- - tier_required = 'teams'      → Only Teams users can access
-- - tier_required = 'enterprise' → Only Enterprise users can access

-- ============================================================================
-- STEP 1: Update V2 agents to tier_required='startup'
-- These are exclusive to Startup tier users
-- ============================================================================
UPDATE ai_agents
SET tier_required = 'startup', updated_at = NOW()
WHERE product_line = 'v2';

-- ============================================================================
-- STEP 2: Update V3 agents to tier_required='teams'
-- These are exclusive to Teams tier users
-- ============================================================================
UPDATE ai_agents
SET tier_required = 'teams', updated_at = NOW()
WHERE product_line = 'v3';

-- ============================================================================
-- STEP 3: Update V4 agents to tier_required='enterprise'
-- These are exclusive to Enterprise tier users
-- ============================================================================
UPDATE ai_agents
SET tier_required = 'enterprise', updated_at = NOW()
WHERE product_line = 'v4';

-- ============================================================================
-- VERIFICATION: List all agents and their tier assignments
-- ============================================================================
-- Run this query to verify the changes:
--
-- SELECT
--   id,
--   name,
--   product_line,
--   tier_required,
--   department_id
-- FROM ai_agents
-- ORDER BY product_line, name;
--
-- Expected results:
-- - V2 agents (7): tier_required = 'startup' → Startup users only
-- - V3 agents (18): tier_required = 'teams' → Teams users only
-- - V4 agents (38): tier_required = 'enterprise' → Enterprise users only
