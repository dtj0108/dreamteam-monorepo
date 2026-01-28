-- 098_audit_logs.sql
-- Audit logging for scheduled task operations and system events

-- ============================================
-- AUDIT LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Action details
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  
  -- Workspace and agent context
  workspace_id UUID,
  agent_id UUID,
  
  -- Actor information (who performed the action)
  actor_type TEXT NOT NULL CHECK (actor_type IN ('system', 'user', 'cron', 'agent')),
  actor_id UUID,
  actor_email TEXT,
  
  -- Request context
  ip_address INET,
  user_agent TEXT,
  request_id TEXT,
  
  -- Detailed metadata about the action
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR COMMON QUERY PATTERNS
-- ============================================

-- Index for filtering by resource type and ID (common lookup pattern)
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- Index for workspace-scoped queries
CREATE INDEX idx_audit_logs_workspace ON audit_logs(workspace_id) WHERE workspace_id IS NOT NULL;

-- Index for agent-scoped queries
CREATE INDEX idx_audit_logs_agent ON audit_logs(agent_id) WHERE agent_id IS NOT NULL;

-- Index for filtering by action type
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- Index for actor-based queries (who did what)
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_type, actor_id);

-- Index for time-based queries (recent activity, time ranges)
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Index for request correlation (tracing requests across services)
CREATE INDEX idx_audit_logs_request_id ON audit_logs(request_id) WHERE request_id IS NOT NULL;

-- Composite index for common admin queries: workspace + time range
CREATE INDEX idx_audit_logs_workspace_time ON audit_logs(workspace_id, created_at DESC) 
  WHERE workspace_id IS NOT NULL;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Superadmins can view all audit logs
CREATE POLICY "Superadmins can view all audit logs" ON audit_logs 
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_superadmin = true));

-- Superadmins can insert audit logs
CREATE POLICY "Superadmins can insert audit logs" ON audit_logs 
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_superadmin = true));

-- ============================================
-- PARTITIONING SETUP (Optional - for high volume)
-- Uncomment if you expect high audit log volume
-- ============================================
-- For high-volume installations, consider partitioning by created_at:
-- CREATE TABLE audit_logs_partitioned (
--   LIKE audit_logs INCLUDING ALL
-- ) PARTITION BY RANGE (created_at);

-- ============================================
-- RETENTION POLICY FUNCTION
-- ============================================

-- Function to clean up old audit logs
-- Retains logs for a configurable number of days (default: 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(
  p_days_to_retain INTEGER DEFAULT 90
)
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM audit_logs
  WHERE created_at < NOW() - (p_days_to_retain || ' days')::INTERVAL;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- QUERY HELPER FUNCTIONS
-- ============================================

-- Function to get audit logs for a specific resource
CREATE OR REPLACE FUNCTION get_audit_logs_for_resource(
  p_resource_type TEXT,
  p_resource_id TEXT,
  p_limit INTEGER DEFAULT 100
)
RETURNS SETOF audit_logs AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM audit_logs
  WHERE resource_type = p_resource_type
    AND resource_id = p_resource_id
  ORDER BY created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get audit logs for a workspace
CREATE OR REPLACE FUNCTION get_workspace_audit_logs(
  p_workspace_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS SETOF audit_logs AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM audit_logs
  WHERE workspace_id = p_workspace_id
    AND (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at <= p_end_date)
  ORDER BY created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Function to get audit log statistics for a workspace
CREATE OR REPLACE FUNCTION get_workspace_audit_stats(
  p_workspace_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT (NOW() - INTERVAL '30 days'),
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_events', COUNT(*),
    'by_action', (
      SELECT jsonb_object_agg(action, cnt)
      FROM (
        SELECT action, COUNT(*) as cnt
        FROM audit_logs
        WHERE workspace_id = p_workspace_id
          AND created_at BETWEEN p_start_date AND p_end_date
        GROUP BY action
      ) subq
    ),
    'by_actor_type', (
      SELECT jsonb_object_agg(actor_type, cnt)
      FROM (
        SELECT actor_type, COUNT(*) as cnt
        FROM audit_logs
        WHERE workspace_id = p_workspace_id
          AND created_at BETWEEN p_start_date AND p_end_date
        GROUP BY actor_type
      ) subq
    ),
    'by_resource_type', (
      SELECT jsonb_object_agg(resource_type, cnt)
      FROM (
        SELECT resource_type, COUNT(*) as cnt
        FROM audit_logs
        WHERE workspace_id = p_workspace_id
          AND created_at BETWEEN p_start_date AND p_end_date
        GROUP BY resource_type
      ) subq
    ),
    'oldest_event', MIN(created_at),
    'newest_event', MAX(created_at)
  )
  INTO v_result
  FROM audit_logs
  WHERE workspace_id = p_workspace_id
    AND created_at BETWEEN p_start_date AND p_end_date;
  
  RETURN COALESCE(v_result, jsonb_build_object(
    'total_events', 0,
    'by_action', '{}'::jsonb,
    'by_actor_type', '{}'::jsonb,
    'by_resource_type', '{}'::jsonb,
    'oldest_event', null,
    'newest_event', null
  ));
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER TO PREVENT UPDATES/DELETES
-- ============================================

-- Audit logs should be immutable - create a trigger to prevent updates
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs cannot be modified. They are immutable for compliance.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_audit_log_update
  BEFORE UPDATE ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_modification();

CREATE TRIGGER trigger_prevent_audit_log_delete
  BEFORE DELETE ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_modification();

-- Note: Use cleanup_old_audit_logs() function for retention management
-- rather than direct DELETE statements
