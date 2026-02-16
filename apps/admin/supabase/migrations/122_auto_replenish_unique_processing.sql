-- Prevent duplicate concurrent auto-replenish attempts per workspace+type.
-- Only one 'processing' attempt can exist at a time.
CREATE UNIQUE INDEX IF NOT EXISTS idx_auto_replenish_unique_processing
  ON auto_replenish_attempts (workspace_id, replenish_type)
  WHERE status = 'processing';
