-- 097_schedule_execution_dlq.sql
-- Dead Letter Queue for failed scheduled executions
-- Tracks failed executions that need manual intervention or exceeded retry limits

-- ============================================
-- DLQ TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS agent_schedule_executions_dlq (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id uuid REFERENCES agent_schedule_executions(id) ON DELETE CASCADE,
  schedule_id uuid REFERENCES agent_schedules(id) ON DELETE SET NULL,
  agent_id uuid,
  workspace_id uuid,
  
  -- Failure tracking
  failed_at timestamptz DEFAULT now(),
  error_message text,
  error_type text, -- 'dispatch_failure', 'execution_error', 'timeout', 'max_retries_exceeded'
  
  -- Retry tracking
  retry_count int DEFAULT 0,
  last_retry_at timestamptz,
  next_retry_at timestamptz,
  max_retries int DEFAULT 3,
  
  -- Manual review
  requires_manual_review boolean DEFAULT false,
  reviewed_at timestamptz,
  reviewed_by uuid,
  review_notes text,
  
  -- Resolution
  status text DEFAULT 'pending', -- 'pending', 'retrying', 'resolved', 'discarded'
  resolved_at timestamptz,
  resolution_action text, -- 'manual_retry', 'auto_retry', 'cancelled', 'fixed_upstream'
  
  -- Context for debugging
  task_prompt text,
  execution_context jsonb, -- Store relevant context for debugging
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_dlq_status ON agent_schedule_executions_dlq(status);
CREATE INDEX idx_dlq_requires_review ON agent_schedule_executions_dlq(requires_manual_review) WHERE requires_manual_review = true;
CREATE INDEX idx_dlq_failed_at ON agent_schedule_executions_dlq(failed_at);
CREATE INDEX idx_dlq_execution_id ON agent_schedule_executions_dlq(execution_id);
CREATE INDEX idx_dlq_workspace_id ON agent_schedule_executions_dlq(workspace_id);
CREATE INDEX idx_dlq_agent_id ON agent_schedule_executions_dlq(agent_id);
CREATE INDEX idx_dlq_error_type ON agent_schedule_executions_dlq(error_type);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE agent_schedule_executions_dlq ENABLE ROW LEVEL SECURITY;

-- Superadmins can manage DLQ
CREATE POLICY "Superadmins can manage DLQ" ON agent_schedule_executions_dlq FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_superadmin = true));

-- ============================================
-- TRIGGER TO UPDATE updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_dlq_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_dlq_updated_at
  BEFORE UPDATE ON agent_schedule_executions_dlq
  FOR EACH ROW
  EXECUTE FUNCTION update_dlq_updated_at();

-- ============================================
-- FUNCTION: Move failed execution to DLQ
-- ============================================
CREATE OR REPLACE FUNCTION move_execution_to_dlq(
  p_execution_id uuid,
  p_error_message text,
  p_error_type text,
  p_requires_manual_review boolean DEFAULT false
)
RETURNS uuid AS $$
DECLARE
  v_dlq_id uuid;
  v_execution_record record;
BEGIN
  -- Get execution details with schedule info
  SELECT 
    e.id, e.schedule_id, e.agent_id, s.workspace_id, s.task_prompt, e.status as execution_status
  INTO v_execution_record
  FROM agent_schedule_executions e
  JOIN agent_schedules s ON e.schedule_id = s.id
  WHERE e.id = p_execution_id;
  
  IF v_execution_record IS NULL THEN
    -- Try to get execution without schedule join (schedule may be deleted)
    SELECT 
      e.id, e.schedule_id, e.agent_id, NULL::uuid as workspace_id, NULL::text as task_prompt, e.status as execution_status
    INTO v_execution_record
    FROM agent_schedule_executions e
    WHERE e.id = p_execution_id;
    
    IF v_execution_record IS NULL THEN
      RETURN NULL;
    END IF;
  END IF;
  
  -- Check if this execution is already in DLQ
  SELECT id INTO v_dlq_id
  FROM agent_schedule_executions_dlq
  WHERE execution_id = p_execution_id;
  
  IF v_dlq_id IS NOT NULL THEN
    -- Update existing DLQ entry
    UPDATE agent_schedule_executions_dlq
    SET 
      retry_count = retry_count + 1,
      last_retry_at = now(),
      error_message = p_error_message,
      error_type = p_error_type,
      requires_manual_review = p_requires_manual_review,
      updated_at = now(),
      execution_context = execution_context || jsonb_build_object(
        'last_failure_at', now(),
        'previous_error', error_message
      )
    WHERE id = v_dlq_id;
    
    RETURN v_dlq_id;
  END IF;
  
  -- Insert into DLQ
  INSERT INTO agent_schedule_executions_dlq (
    execution_id, schedule_id, agent_id, workspace_id,
    error_message, error_type, requires_manual_review,
    task_prompt, execution_context
  ) VALUES (
    p_execution_id, v_execution_record.schedule_id, v_execution_record.agent_id, v_execution_record.workspace_id,
    p_error_message, p_error_type, p_requires_manual_review,
    v_execution_record.task_prompt,
    jsonb_build_object(
      'moved_at', now(),
      'original_execution_id', p_execution_id,
      'original_status', v_execution_record.execution_status
    )
  )
  RETURNING id INTO v_dlq_id;
  
  RETURN v_dlq_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION: Retry a DLQ item
-- ============================================
CREATE OR REPLACE FUNCTION retry_dlq_item(
  p_dlq_id uuid, 
  p_reviewed_by uuid DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
  v_dlq_record record;
  v_max_retries int;
BEGIN
  SELECT * INTO v_dlq_record 
  FROM agent_schedule_executions_dlq 
  WHERE id = p_dlq_id;
  
  IF v_dlq_record IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if already resolved
  IF v_dlq_record.status = 'resolved' OR v_dlq_record.status = 'discarded' THEN
    RETURN false;
  END IF;
  
  -- Get max retries from record or default
  v_max_retries := COALESCE(v_dlq_record.max_retries, 3);
  
  -- Check if we've exceeded max retries
  IF v_dlq_record.retry_count >= v_max_retries THEN
    -- Update to require manual review
    UPDATE agent_schedule_executions_dlq
    SET 
      requires_manual_review = true,
      review_notes = COALESCE(review_notes || E'\n', '') || 'Max retries exceeded. Manual intervention required.',
      updated_at = now()
    WHERE id = p_dlq_id;
    
    RETURN false;
  END IF;
  
  -- Update DLQ record
  UPDATE agent_schedule_executions_dlq
  SET 
    status = 'retrying',
    retry_count = retry_count + 1,
    last_retry_at = now(),
    next_retry_at = now() + (retry_count + 1) * interval '5 minutes',
    reviewed_by = COALESCE(p_reviewed_by, reviewed_by),
    updated_at = now()
  WHERE id = p_dlq_id;
  
  -- Reset execution status to pending for reprocessing
  -- Note: The actual re-dispatch should be handled by application logic
  UPDATE agent_schedule_executions
  SET status = 'pending', error_message = NULL, completed_at = NULL
  WHERE id = v_dlq_record.execution_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION: Resolve a DLQ item
-- ============================================
CREATE OR REPLACE FUNCTION resolve_dlq_item(
  p_dlq_id uuid,
  p_resolution_action text,
  p_reviewed_by uuid,
  p_notes text DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
  v_dlq_record record;
BEGIN
  SELECT * INTO v_dlq_record 
  FROM agent_schedule_executions_dlq 
  WHERE id = p_dlq_id;
  
  IF v_dlq_record IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if already resolved
  IF v_dlq_record.status = 'resolved' OR v_dlq_record.status = 'discarded' THEN
    RETURN false;
  END IF;
  
  -- Update DLQ record
  UPDATE agent_schedule_executions_dlq
  SET 
    status = CASE 
      WHEN p_resolution_action = 'cancelled' THEN 'discarded'
      ELSE 'resolved'
    END,
    resolved_at = now(),
    resolution_action = p_resolution_action,
    reviewed_by = p_reviewed_by,
    review_notes = COALESCE(p_notes, review_notes),
    reviewed_at = COALESCE(reviewed_at, now()),
    updated_at = now()
  WHERE id = p_dlq_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION: Get DLQ statistics
-- ============================================
CREATE OR REPLACE FUNCTION get_dlq_stats(
  p_workspace_id uuid DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_pending', COUNT(*) FILTER (WHERE status = 'pending'),
    'total_retrying', COUNT(*) FILTER (WHERE status = 'retrying'),
    'total_resolved', COUNT(*) FILTER (WHERE status = 'resolved'),
    'total_discarded', COUNT(*) FILTER (WHERE status = 'discarded'),
    'requires_manual_review', COUNT(*) FILTER (WHERE requires_manual_review = true AND status IN ('pending', 'retrying')),
    'by_error_type', jsonb_object_agg(
      COALESCE(error_type, 'unknown'),
      cnt
    ) FILTER (WHERE error_type IS NOT NULL),
    'oldest_failure', MIN(failed_at) FILTER (WHERE status = 'pending'),
    'newest_failure', MAX(failed_at) FILTER (WHERE status = 'pending')
  )
  INTO v_result
  FROM agent_schedule_executions_dlq
  WHERE (p_workspace_id IS NULL OR workspace_id = p_workspace_id);
  
  RETURN COALESCE(v_result, jsonb_build_object(
    'total_pending', 0,
    'total_retrying', 0,
    'total_resolved', 0,
    'total_discarded', 0,
    'requires_manual_review', 0,
    'by_error_type', jsonb_build_object(),
    'oldest_failure', null,
    'newest_failure', null
  ));
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION: Auto-cleanup old resolved DLQ entries
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_old_dlq_entries(
  p_days_old int DEFAULT 30
)
RETURNS int AS $$
DECLARE
  v_deleted_count int;
BEGIN
  DELETE FROM agent_schedule_executions_dlq
  WHERE status IN ('resolved', 'discarded')
    AND resolved_at < now() - (p_days_old || ' days')::interval;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;
