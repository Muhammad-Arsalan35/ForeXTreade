-- Create a compatibility view for transactions pointing to wallet_transactions
create or replace view public.transactions as
select 
  wt.id,
  wt.user_id,
  wt.amount,
  wt.transaction_type,
  wt.wallet_type,
  wt.description,
  wt.reference_id,
  wt.reference_table,
  wt.created_at
from public.wallet_transactions wt;

-- No-op RPC stubs to prevent 404s from frontend calls
create or replace function public.start_user_session(
  p_user_id uuid,
  p_session_id text,
  p_ip_address text,
  p_user_agent text
) returns boolean
language plpgsql
security definer
as $$
begin
  -- Intentionally minimal; extend to log sessions if needed
  return true;
end;
$$;

create or replace function public.end_user_session(
  p_session_id text
) returns boolean
language plpgsql
security definer
as $$
begin
  -- Intentionally minimal; extend to end sessions if needed
  return true;
end;
$$;

create or replace function public.track_user_activity(
  p_user_id uuid,
  p_activity_type text,
  p_activity_data jsonb,
  p_session_id text
) returns boolean
language plpgsql
security definer
as $$
begin
  -- Intentionally minimal; extend to persist activity if needed
  return true;
end;
$$;