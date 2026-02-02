-- 110_populate_team_agents.sql
-- Populate team_agents junction table based on ai_agents.tier_required
-- This enables autoDeployTeamForPlan() to find agents for each team
--
-- Problem: Migration 075 creates team_agents table but never populates it
-- Result: autoDeployTeamForPlan() returns empty agents array
--
-- Mapping (tier_required → team slug):
--   startup    → starter
--   teams      → growth
--   enterprise → scale

-- Clear existing team_agents (if any partial data)
DELETE FROM team_agents;

-- Insert startup tier agents into starter team
INSERT INTO team_agents (team_id, agent_id, role, display_order)
SELECT
  t.id as team_id,
  a.id as agent_id,
  CASE WHEN a.name LIKE '%Co-Founder%' THEN 'head' ELSE 'member' END as role,
  ROW_NUMBER() OVER (ORDER BY a.name) as display_order
FROM ai_agents a
CROSS JOIN teams t
WHERE a.tier_required = 'startup'
  AND a.is_enabled = true
  AND t.slug = 'starter'
ON CONFLICT (team_id, agent_id) DO NOTHING;

-- Insert teams tier agents into growth team
INSERT INTO team_agents (team_id, agent_id, role, display_order)
SELECT
  t.id as team_id,
  a.id as agent_id,
  'member' as role,
  ROW_NUMBER() OVER (ORDER BY a.name) as display_order
FROM ai_agents a
CROSS JOIN teams t
WHERE a.tier_required = 'teams'
  AND a.is_enabled = true
  AND t.slug = 'growth'
ON CONFLICT (team_id, agent_id) DO NOTHING;

-- Insert enterprise tier agents into scale team
INSERT INTO team_agents (team_id, agent_id, role, display_order)
SELECT
  t.id as team_id,
  a.id as agent_id,
  'member' as role,
  ROW_NUMBER() OVER (ORDER BY a.name) as display_order
FROM ai_agents a
CROSS JOIN teams t
WHERE a.tier_required = 'enterprise'
  AND a.is_enabled = true
  AND t.slug = 'scale'
ON CONFLICT (team_id, agent_id) DO NOTHING;

-- Verify population
DO $$
DECLARE
  starter_count INT;
  growth_count INT;
  scale_count INT;
BEGIN
  SELECT COUNT(*) INTO starter_count FROM team_agents ta
  JOIN teams t ON ta.team_id = t.id WHERE t.slug = 'starter';

  SELECT COUNT(*) INTO growth_count FROM team_agents ta
  JOIN teams t ON ta.team_id = t.id WHERE t.slug = 'growth';

  SELECT COUNT(*) INTO scale_count FROM team_agents ta
  JOIN teams t ON ta.team_id = t.id WHERE t.slug = 'scale';

  RAISE NOTICE 'Team agents populated: starter=%, growth=%, scale=%',
    starter_count, growth_count, scale_count;

  IF starter_count = 0 AND growth_count = 0 AND scale_count = 0 THEN
    RAISE WARNING 'No agents were added to any team! Check ai_agents.tier_required values.';
  END IF;
END $$;
