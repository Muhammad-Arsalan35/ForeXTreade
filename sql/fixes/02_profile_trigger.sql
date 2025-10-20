-- ==========================================================================
-- AUTH -> USERS + USER_PROFILES TRIGGER (SECURITY DEFINER)
-- Creates a users row and a linked user_profiles row on auth.users insert
-- Run this in Supabase SQL Editor
-- ==========================================================================

-- Drop previous trigger/function if present (safe to re-run)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.create_user_profile_from_auth() CASCADE;

CREATE OR REPLACE FUNCTION public.create_user_profile_from_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_user_id UUID;
  unique_username TEXT;
  base_username TEXT;
  counter INTEGER := 0;
BEGIN
  -- Derive a base username from metadata or fallback to user_<short-id>
  base_username := COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 8));
  unique_username := base_username;

  -- Ensure username uniqueness
  WHILE EXISTS (SELECT 1 FROM public.users WHERE username = unique_username) LOOP
    counter := counter + 1;
    unique_username := base_username || '_' || counter;
  END LOOP;

  -- Create users row
  INSERT INTO public.users (
    auth_user_id,
    full_name,
    username,
    phone_number,
    referral_code,
    user_status,
    vip_level,
    personal_wallet_balance,
    income_wallet_balance,
    total_earnings,
    total_invested,
    position_title
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    unique_username,
    COALESCE(NEW.raw_user_meta_data->>'phone_number', NEW.phone, NULL),
    UPPER(substr(gen_random_uuid()::text, 1, 8)),
    'active',
    'intern',
    0.00,
    0.00,
    0.00,
    0.00,
    'Member'
  ) RETURNING id INTO new_user_id;

  -- Create user_profiles row linked to users.id
  INSERT INTO public.user_profiles (
    user_id,
    full_name,
    username,
    phone_number,
    membership_type,
    membership_level,
    is_trial_active,
    trial_start_date,
    trial_end_date,
    videos_watched_today,
    last_video_reset_date,
    total_earnings,
    income_wallet_balance,
    personal_wallet_balance
  ) VALUES (
    new_user_id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    unique_username,
    COALESCE(NEW.raw_user_meta_data->>'phone_number', NEW.phone, NULL),
    'intern',
    'Intern',
    true,
    CURRENT_DATE,
    CURRENT_DATE,
    0,
    CURRENT_DATE,
    0.00,
    0.00,
    0.00
  );

  RETURN NEW;
END
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.create_user_profile_from_auth();