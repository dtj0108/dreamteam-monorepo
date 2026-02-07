-- 119_workspace_billing_deploy_tracking_repair.sql
-- Repair migration for environments that missed deploy-tracking columns.

-- ============================================
-- 1. ENSURE DEPLOYMENT TRACKING COLUMNS EXIST
-- ============================================
ALTER TABLE IF EXISTS public.workspace_billing
  ADD COLUMN IF NOT EXISTS agent_deploy_status TEXT,
  ADD COLUMN IF NOT EXISTS agent_deploy_error TEXT,
  ADD COLUMN IF NOT EXISTS agent_deploy_attempted_at TIMESTAMPTZ;

-- ============================================
-- 2. NORMALIZE INVALID STATUS VALUES (IF ANY)
-- ============================================
UPDATE public.workspace_billing
SET agent_deploy_status = NULL
WHERE agent_deploy_status IS NOT NULL
  AND agent_deploy_status NOT IN ('pending', 'deployed', 'failed');

-- ============================================
-- 3. ENFORCE STATUS CHECK CONSTRAINT
-- ============================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'workspace_billing'
      AND column_name = 'agent_deploy_status'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'workspace_billing'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%agent_deploy_status%'
  ) THEN
    ALTER TABLE public.workspace_billing
      ADD CONSTRAINT workspace_billing_agent_deploy_status_check
      CHECK (agent_deploy_status IN ('pending', 'deployed', 'failed'));
  END IF;
END $$;

-- ============================================
-- 4. COMMENTS + INDEX FOR FAILED DEPLOYS
-- ============================================
COMMENT ON COLUMN public.workspace_billing.agent_deploy_status
  IS 'Status of the most recent agent deployment attempt';

COMMENT ON COLUMN public.workspace_billing.agent_deploy_error
  IS 'Error message if the most recent deployment failed';

COMMENT ON COLUMN public.workspace_billing.agent_deploy_attempted_at
  IS 'Timestamp of the most recent deployment attempt';

CREATE INDEX IF NOT EXISTS idx_workspace_billing_deploy_failed
  ON public.workspace_billing(workspace_id)
  WHERE agent_deploy_status = 'failed';
