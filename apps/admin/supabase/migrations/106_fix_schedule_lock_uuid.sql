-- Fix schedule locking functions to handle UUID hyphens correctly
-- The previous version failed because UUIDs contain hyphens which aren't valid hex digits

-- Fix acquire_schedule_lock to handle UUID hyphens
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

-- Fix release_schedule_lock
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

-- Fix is_schedule_locked
CREATE OR REPLACE FUNCTION is_schedule_locked(schedule_id uuid)
RETURNS boolean AS $$
DECLARE
  lock_id bigint;
  is_held boolean;
  uuid_hex text;
BEGIN
  uuid_hex := replace(schedule_id::text, '-', '');
  lock_id := ('x' || substr(uuid_hex, 1, 16))::bit(64)::bigint;
  
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
