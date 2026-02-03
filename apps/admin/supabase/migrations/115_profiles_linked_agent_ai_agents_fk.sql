-- 115_profiles_linked_agent_ai_agents_fk.sql
-- Align profiles.linked_agent_id with ai_agents (team-mode agents)

-- 1) Remap any legacy agent references to ai_agents when possible
UPDATE profiles p
SET linked_agent_id = a.ai_agent_id
FROM agents a
WHERE p.linked_agent_id = a.id
  AND a.ai_agent_id IS NOT NULL;

UPDATE channels c
SET linked_agent_id = a.ai_agent_id
FROM agents a
WHERE c.linked_agent_id = a.id
  AND a.ai_agent_id IS NOT NULL;

-- 2) Null out any remaining invalid references (not in ai_agents)
UPDATE profiles p
SET linked_agent_id = NULL
WHERE linked_agent_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM ai_agents aa WHERE aa.id = p.linked_agent_id
  );

UPDATE channels c
SET linked_agent_id = NULL
WHERE linked_agent_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM ai_agents aa WHERE aa.id = c.linked_agent_id
  );

-- 3) Drop old FK (agents) and add new FK (ai_agents)
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_linked_agent_id_fkey;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_linked_agent_id_fkey
  FOREIGN KEY (linked_agent_id)
  REFERENCES ai_agents(id)
  ON DELETE SET NULL;
