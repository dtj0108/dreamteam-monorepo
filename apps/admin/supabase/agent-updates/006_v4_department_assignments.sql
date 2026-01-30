-- DreamTeam V4: Ensure departments exist and agents are assigned correctly
-- Run this BEFORE 005_v4_agents.sql if departments don't exist

-- ============================================================================
-- ENSURE ALL DEPARTMENTS EXIST
-- ============================================================================

-- Sales Department
INSERT INTO agent_departments (id, name, description, icon, default_model)
SELECT gen_random_uuid(), 'Sales', 'Revenue generation and customer acquisition', 'TrendingUp', 'grok-4-fast'
WHERE NOT EXISTS (SELECT 1 FROM agent_departments WHERE name = 'Sales');

-- Marketing Department
INSERT INTO agent_departments (id, name, description, icon, default_model)
SELECT gen_random_uuid(), 'Marketing', 'Brand, content, and demand generation', 'Megaphone', 'grok-4-fast'
WHERE NOT EXISTS (SELECT 1 FROM agent_departments WHERE name = 'Marketing');

-- Finance Department
INSERT INTO agent_departments (id, name, description, icon, default_model)
SELECT gen_random_uuid(), 'Finance', 'Financial strategy and operations', 'DollarSign', 'grok-4-fast'
WHERE NOT EXISTS (SELECT 1 FROM agent_departments WHERE name = 'Finance');

-- Execution Department
INSERT INTO agent_departments (id, name, description, icon, default_model)
SELECT gen_random_uuid(), 'Execution', 'Operations and program management', 'CheckSquare', 'grok-4-fast'
WHERE NOT EXISTS (SELECT 1 FROM agent_departments WHERE name = 'Execution');

-- People Department
INSERT INTO agent_departments (id, name, description, icon, default_model)
SELECT gen_random_uuid(), 'People', 'HR, talent, and organizational health', 'Users', 'grok-4-fast'
WHERE NOT EXISTS (SELECT 1 FROM agent_departments WHERE name = 'People');

-- Leadership Department
INSERT INTO agent_departments (id, name, description, icon, default_model)
SELECT gen_random_uuid(), 'Leadership', 'Strategy, vision, and executive functions', 'Crown', 'grok-4-fast'
WHERE NOT EXISTS (SELECT 1 FROM agent_departments WHERE name = 'Leadership');

-- Systems Department
INSERT INTO agent_departments (id, name, description, icon, default_model)
SELECT gen_random_uuid(), 'Systems', 'Data, automation, and infrastructure', 'Server', 'grok-4-fast'
WHERE NOT EXISTS (SELECT 1 FROM agent_departments WHERE name = 'Systems');

-- ============================================================================
-- FIX DEPARTMENT ASSIGNMENTS FOR V4 AGENTS (if they exist with wrong department)
-- ============================================================================

-- Sales Department Agents
UPDATE ai_agents SET department_id = (SELECT id FROM agent_departments WHERE name = 'Sales')
WHERE product_line = 'v4' AND slug IN (
  'pipeline-agent-v4',
  'sales-strategist-agent-v4',
  'deal-review-agent-v4',
  'revenue-forecast-agent-v4',
  'objection-intelligence-agent-v4',
  'follow-up-automation-agent-v4'
);

-- Execution Department Agents
UPDATE ai_agents SET department_id = (SELECT id FROM agent_departments WHERE name = 'Execution')
WHERE product_line = 'v4' AND slug IN (
  'program-manager-agent-v4',
  'workflow-architect-agent-v4',
  'execution-monitor-agent-v4',
  'bottleneck-detector-agent-v4',
  'qa-agent-v4',
  'sop-agent-v4'
);

-- People Department Agents
UPDATE ai_agents SET department_id = (SELECT id FROM agent_departments WHERE name = 'People')
WHERE product_line = 'v4' AND slug IN (
  'hiring-agent-v4',
  'org-design-agent-v4',
  'talent-optimization-agent-v4',
  'burnout-prevention-agent-v4',
  'leadership-coach-agent-v4'
);

-- Marketing Department Agents
UPDATE ai_agents SET department_id = (SELECT id FROM agent_departments WHERE name = 'Marketing')
WHERE product_line = 'v4' AND slug IN (
  'content-strategy-agent-v4',
  'analytics-agent-v4',
  'distribution-agent-v4',
  'growth-experiments-agent-v4',
  'brand-agent-v4',
  'funnel-optimization-agent-v4'
);

-- Finance Department Agents
UPDATE ai_agents SET department_id = (SELECT id FROM agent_departments WHERE name = 'Finance')
WHERE product_line = 'v4' AND slug IN (
  'cfo-agent-v4',
  'capital-allocation-agent-v4',
  'unit-economics-agent-v4',
  'forecasting-agent-v4',
  'exit-ma-agent-v4'
);

-- Leadership Department Agents
UPDATE ai_agents SET department_id = (SELECT id FROM agent_departments WHERE name = 'Leadership')
WHERE product_line = 'v4' AND slug IN (
  'ceo-agent-v4',
  'priority-agent-v4',
  'long-term-vision-agent-v4',
  'risk-agent-v4',
  'strategy-agent-v4'
);

-- Systems Department Agents
UPDATE ai_agents SET department_id = (SELECT id FROM agent_departments WHERE name = 'Systems')
WHERE product_line = 'v4' AND slug IN (
  'data-agent-v4',
  'ai-workflow-agent-v4',
  'automation-architect-agent-v4',
  'integration-agent-v4',
  'scalability-agent-v4'
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE '=== V4 Agent Department Assignments ===';

  FOR rec IN
    SELECT d.name as department, COUNT(*) as agent_count
    FROM ai_agents a
    JOIN agent_departments d ON a.department_id = d.id
    WHERE a.product_line = 'v4'
    GROUP BY d.name
    ORDER BY d.name
  LOOP
    RAISE NOTICE '%: % agents', rec.department, rec.agent_count;
  END LOOP;

  -- Check for any unassigned agents
  FOR rec IN
    SELECT name, slug FROM ai_agents
    WHERE product_line = 'v4' AND department_id IS NULL
  LOOP
    RAISE NOTICE 'WARNING: Unassigned agent: % (%)', rec.name, rec.slug;
  END LOOP;
END $$;
