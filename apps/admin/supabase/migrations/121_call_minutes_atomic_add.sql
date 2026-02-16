CREATE OR REPLACE FUNCTION add_call_minutes_safe(
  p_workspace_id UUID,
  p_seconds INTEGER
)
RETURNS void AS $$
BEGIN
  INSERT INTO workspace_call_minutes (workspace_id, balance_seconds, lifetime_seconds)
  VALUES (p_workspace_id, p_seconds, p_seconds)
  ON CONFLICT (workspace_id) DO UPDATE SET
    balance_seconds = workspace_call_minutes.balance_seconds + p_seconds,
    lifetime_seconds = workspace_call_minutes.lifetime_seconds + p_seconds,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
