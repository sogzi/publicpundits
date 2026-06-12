-- ============================================================
-- Migration 008: RPC helper for atomic points increment
-- Called by calculate-points edge function
-- ============================================================

create or replace function public.increment_player_points(
  p_user_id         uuid,
  p_points          numeric,
  p_correct_score   integer,
  p_correct_outcome integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set
    total_points     = total_points     + p_points,
    correct_scores   = correct_scores   + p_correct_score,
    correct_outcomes = correct_outcomes + p_correct_outcome,
    updated_at       = now()
  where id = p_user_id;
end;
$$;

-- Grant execute to service_role (edge functions use this key)
grant execute on function public.increment_player_points(uuid, numeric, integer, integer)
  to service_role;
