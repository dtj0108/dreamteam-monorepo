-- Atomic update function for phone subscription counts
-- Prevents race conditions from concurrent read-modify-write operations
-- Uses col = col + delta pattern for atomicity within a single UPDATE statement

CREATE OR REPLACE FUNCTION update_phone_subscription_counts(
  p_workspace_id UUID,
  p_local_delta INTEGER DEFAULT 0,
  p_toll_free_delta INTEGER DEFAULT 0,
  p_monthly_cents_delta INTEGER DEFAULT 0
)
RETURNS void AS $$
BEGIN
  UPDATE phone_number_subscriptions
  SET
    local_numbers = local_numbers + p_local_delta,
    toll_free_numbers = toll_free_numbers + p_toll_free_delta,
    total_numbers = (local_numbers + p_local_delta) + (toll_free_numbers + p_toll_free_delta),
    monthly_total_cents = GREATEST(0, monthly_total_cents + p_monthly_cents_delta),
    updated_at = now()
  WHERE workspace_id = p_workspace_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
