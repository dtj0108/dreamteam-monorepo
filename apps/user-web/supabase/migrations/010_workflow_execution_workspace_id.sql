-- activities
ALTER TABLE activities ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id);
CREATE INDEX IF NOT EXISTS idx_activities_workspace_id ON activities(workspace_id);
UPDATE activities a SET workspace_id = p.default_workspace_id
FROM profiles p WHERE a.profile_id = p.id AND a.workspace_id IS NULL AND p.default_workspace_id IS NOT NULL;

-- workflow_executions
ALTER TABLE workflow_executions ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workspace_id ON workflow_executions(workspace_id);
UPDATE workflow_executions we SET workspace_id = w.workspace_id
FROM workflows w WHERE we.workflow_id = w.id AND we.workspace_id IS NULL AND w.workspace_id IS NOT NULL;

-- workflow_scheduled_actions
ALTER TABLE workflow_scheduled_actions ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id);
CREATE INDEX IF NOT EXISTS idx_workflow_scheduled_actions_workspace_id ON workflow_scheduled_actions(workspace_id);
UPDATE workflow_scheduled_actions wsa SET workspace_id = w.workspace_id
FROM workflows w WHERE wsa.workflow_id = w.id AND wsa.workspace_id IS NULL AND w.workspace_id IS NOT NULL;

-- lead_tasks
ALTER TABLE lead_tasks ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id);
CREATE INDEX IF NOT EXISTS idx_lead_tasks_workspace_id ON lead_tasks(workspace_id);
UPDATE lead_tasks lt SET workspace_id = l.workspace_id
FROM leads l WHERE lt.lead_id = l.id AND lt.workspace_id IS NULL AND l.workspace_id IS NOT NULL;
