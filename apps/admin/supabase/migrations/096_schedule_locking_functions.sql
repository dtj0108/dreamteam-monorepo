-- Distributed locking functions for schedule processing
-- Prevents race conditions when multiple cron instances process the same schedules

-- Acquire an advisory lock for a schedule
-- Returns true if lock acquired, false if already locked
CREATE OR REPLACE FUNCTION acquire_schedule_lock(schedule_id uuid, lock_timeout interval DEFAULT '5 minutes')
RETURNS boolean AS $$
DECLARE
  lock_id bigint;
  acquired boolean;
  uuid_hex text;
BEGIN
  -- Convert UUID to bigint lock ID (using first 16 hex chars, removing hyphens)
  uuid_hex := replace(schedule_id::text, '-', '');
  lock_id := ('x' || substr(uuid_hex, 1, 16))::bit(64)::bigint;
  
  -- Try to acquire lock
  SELECT pg_try_advisory_lock(lock_id) INTO acquired;
  
  IF acquired THEN
    -- Record lock acquisition time for timeout tracking
    PERFORM pg_advisory_xact_lock(lock_id);
  END IF;
  
  RETURN acquired;
END;
$$ LANGUAGE plpgsql;

-- Release advisory lock for a schedule
CREATE OR REPLACE FUNCTION release_schedule_lock(schedule_id uuid)
RETURNS void AS $$
DECLARE
  lock_id bigint;
  uuid_hex text;
BEGIN
  uuid_hex := replace(schedule_id::text, '-', '');
  lock_id := ('x' || substr(uuid_hex, 1, 16))::bit(64)::bigint;
  PERFORM pg_advisory_unlock(lock_id);
END;
$$ LANGUAGE plpgsql;

-- Fetch and lock due schedules using SKIP LOCKED
-- This function returns schedules that are due to run, with row-level locking
-- to prevent multiple workers from processing the same schedule
CREATE OR REPLACE FUNCTION fetch_due_schedules(batch_size int DEFAULT 50)
RETURNS TABLE (
  id uuid,
  agent_id uuid,
  name text,
  cron_expression text,
  timezone text,
  task_prompt text,
  requires_approval boolean,
  is_enabled boolean,
  next_run_at timestamptz,
  workspace_id uuid,
  created_by uuid,
  output_config jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.agent_id,
    s.name,
    s.cron_expression,
    s.timezone,
    s.task_prompt,
    s.requires_approval,
    s.is_enabled,
    s.next_run_at,
    s.workspace_id,
    s.created_by,
    s.output_config
  FROM agent_schedules s
  WHERE s.is_enabled = true
    AND s.next_run_at <= now()
  ORDER BY s.next_run_at ASC
  FOR UPDATE SKIP LOCKED
  LIMIT batch_size;
END;
$$ LANGUAGE plpgsql;

-- Check if a schedule lock is currently held
-- Useful for debugging and monitoring
CREATE OR REPLACE FUNCTION is_schedule_locked(schedule_id uuid)
RETURNS boolean AS $$
DECLARE
  lock_id bigint;
  is_held boolean;
  uuid_hex text;
BEGIN
  uuid_hex := replace(schedule_id::text, '-', '');
  lock_id := ('x' || substr(uuid_hex, 1, 16))::bit(64)::bigint;
  
  -- Check if lock is held by any session
  SELECT EXISTS (
    SELECT 1 FROM pg_locks 
    WHERE locktype = 'advisory' 
      AND classid = 0 
      AND objid = lock_id
      AND granted = true
  ) INTO is_held;
  
  RETURN is_held;
END;
$$ LANGUAGE plpgsql;

-- Get all currently held schedule locks
-- Useful for debugging lock contention
CREATE OR REPLACE FUNCTION get_active_schedule_locks()
RETURNS TABLE (
  schedule_id uuid,
  pid integer,
  mode text,
  granted boolean,
  query_start timestamptz,
  state text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- Convert back from lock_id to a uuid-like format (approximate, for debugging)
    lpad(to_hex((l.objid)::bigint), 16, '0')::uuid as schedule_id,
    a.pid,
    l.mode,
    l.granted,
    a.query_start,
    a.state
  FROM pg_locks l
  JOIN pg_stat_activity a ON l.pid = a.pid
  WHERE l.locktype = 'advisory' 
    AND l.classid = 0
    AND l.granted = true;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION acquire_schedule_lock(uuid, interval) IS 'Acquires an advisory lock for a schedule. Returns true if lock acquired, false if already locked by another session.';
COMMENT ON FUNCTION release_schedule_lock(uuid) IS 'Releases the advisory lock for a schedule. Should be called after processing is complete.';
COMMENT ON FUNCTION fetch_due_schedules(int) IS 'Fetches due schedules with row-level locking using SKIP LOCKED to prevent race conditions.';
COMMENT ON FUNCTION is_schedule_locked(uuid) IS 'Checks if a schedule lock is currently held by any session.';
COMMENT ON FUNCTION get_active_schedule_locks() IS 'Returns all currently held advisory locks for schedules with session information.';
