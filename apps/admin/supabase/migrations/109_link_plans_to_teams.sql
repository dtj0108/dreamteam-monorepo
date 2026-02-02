-- 109_link_plans_to_teams.sql
-- Link agent tier plans to their corresponding teams
-- This ensures autoDeployTeamForPlan() can find the team to deploy
--
-- Current issue: Plans are created with team_id = NULL
-- autoDeployTeamForPlan() fails silently with "Plan {slug} has no associated team"
--
-- Mapping (plan slug → team slug):
--   startup    →  starter
--   teams      →  growth
--   enterprise →  scale

-- Update startup plan → starter team
UPDATE plans
SET team_id = t.id
FROM teams t
WHERE plans.slug = 'startup'
  AND plans.plan_type = 'agent_tier'
  AND t.slug = 'starter';

-- Update teams plan → growth team
UPDATE plans
SET team_id = t.id
FROM teams t
WHERE plans.slug = 'teams'
  AND plans.plan_type = 'agent_tier'
  AND t.slug = 'growth';

-- Update enterprise plan → scale team
UPDATE plans
SET team_id = t.id
FROM teams t
WHERE plans.slug = 'enterprise'
  AND plans.plan_type = 'agent_tier'
  AND t.slug = 'scale';

-- Verify the updates
DO $$
DECLARE
  unlinked_count INT;
BEGIN
  SELECT COUNT(*) INTO unlinked_count
  FROM plans
  WHERE plan_type = 'agent_tier'
    AND is_active = true
    AND team_id IS NULL;

  IF unlinked_count > 0 THEN
    RAISE WARNING 'Found % active agent_tier plans without team_id', unlinked_count;
  END IF;
END $$;
