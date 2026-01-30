-- Workflows table for automation definitions
CREATE TABLE IF NOT EXISTS workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    trigger_type TEXT NOT NULL,
    trigger_config JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT false,
    actions JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for user lookup
CREATE INDEX IF NOT EXISTS idx_workflows_user_id ON workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_workflows_is_active ON workflows(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_workflows_trigger_type ON workflows(trigger_type);

-- Workflow executions table for run history
CREATE TABLE IF NOT EXISTS workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    trigger_type TEXT NOT NULL,
    trigger_context JSONB NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'paused')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    action_results JSONB NOT NULL DEFAULT '[]',
    error_message TEXT
);

-- Indexes for workflow executions
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_user_id ON workflow_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_started_at ON workflow_executions(started_at DESC);

-- Workflow scheduled actions for delayed/paused executions
CREATE TABLE IF NOT EXISTS workflow_scheduled_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    action_index INTEGER NOT NULL DEFAULT 0,
    remaining_actions JSONB NOT NULL DEFAULT '[]',
    workflow_context JSONB NOT NULL DEFAULT '{}',
    scheduled_for TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- Indexes for scheduled actions
CREATE INDEX IF NOT EXISTS idx_workflow_scheduled_actions_scheduled_for ON workflow_scheduled_actions(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_workflow_scheduled_actions_status ON workflow_scheduled_actions(status);
CREATE INDEX IF NOT EXISTS idx_workflow_scheduled_actions_workflow_id ON workflow_scheduled_actions(workflow_id);

-- Enable RLS
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_scheduled_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workflows
CREATE POLICY "Users can view their own workflows"
    ON workflows FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own workflows"
    ON workflows FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workflows"
    ON workflows FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workflows"
    ON workflows FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for workflow_executions
CREATE POLICY "Users can view their own workflow executions"
    ON workflow_executions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own workflow executions"
    ON workflow_executions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workflow executions"
    ON workflow_executions FOR UPDATE
    USING (auth.uid() = user_id);

-- RLS Policies for workflow_scheduled_actions
CREATE POLICY "Users can view their own scheduled actions"
    ON workflow_scheduled_actions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own scheduled actions"
    ON workflow_scheduled_actions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scheduled actions"
    ON workflow_scheduled_actions FOR UPDATE
    USING (auth.uid() = user_id);

-- Updated_at trigger for workflows
CREATE OR REPLACE FUNCTION update_workflows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_workflows_updated_at ON workflows;
CREATE TRIGGER trigger_workflows_updated_at
    BEFORE UPDATE ON workflows
    FOR EACH ROW
    EXECUTE FUNCTION update_workflows_updated_at();
