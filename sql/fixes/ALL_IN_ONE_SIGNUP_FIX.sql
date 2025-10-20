-- ============================================================================
-- ALL-IN-ONE SIGNUP FIX (Run once in Supabase SQL Editor)
-- ============================================================================
-- This script applies in order:
-- 1) Required extensions
-- 2) Schema alignment for users and user_profiles
-- 3) RLS policies for users and user_profiles
-- 4) SECURITY DEFINER trigger to auto-create users + user_profiles on auth signup
-- 5) Verification queries
-- ----------------------------------------------------------------------------
-- Re-run safe: This script uses IF NOT EXISTS and drops/creates policies/triggers
-- ============================================================================

-- 1) Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2) Schema alignment (users)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS referral_code TEXT,
  ADD COLUMN IF NOT EXISTS user_status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS vip_level TEXT DEFAULT 'intern',
  ADD COLUMN IF NOT EXISTS personal_wallet_balance NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS income_wallet_balance NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_earnings NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_invested NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS position_title TEXT DEFAULT 'Member';

-- 2) Schema alignment (user_profiles)
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS membership_type TEXT DEFAULT 'intern',
  ADD COLUMN IF NOT EXISTS membership_level TEXT DEFAULT 'Intern',
  ADD COLUMN IF NOT EXISTS is_trial_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS trial_start_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS trial_end_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS videos_watched_today INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_video_reset_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS total_earnings NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS income_wallet_balance NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS personal_wallet_balance NUMERIC DEFAULT 0;

-- Optional: referral level for profiles (A/B/C)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'referral_level'
  ) THEN
    ALTER TABLE public.user_profiles
      ADD COLUMN referral_level VARCHAR(1) DEFAULT 'A'
      CHECK (referral_level IN ('A','B','C'));
  END IF;
END $$;

UPDATE public.user_profiles
SET referral_level = COALESCE(referral_level, 'A')
WHERE referral_level IS NULL;

-- 3) RLS policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (safe)
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Allow user creation during signup" ON public.users;
DROP POLICY IF EXISTS "Users can view other users for referrals" ON public.users;

DROP POLICY IF EXISTS "Profiles read own" ON public.user_profiles;
DROP POLICY IF EXISTS "Profiles insert via trigger" ON public.user_profiles;
DROP POLICY IF EXISTS "Profiles update own" ON public.user_profiles;

-- Users policies
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = auth_user_id);

CREATE POLICY "Allow user creation during signup" ON public.users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view other users for referrals" ON public.users
  FOR SELECT USING (auth.role() = 'authenticated');

-- Profiles policies
CREATE POLICY "Profiles read own" ON public.user_profiles
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM public.users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Profiles insert via trigger" ON public.user_profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Profiles update own" ON public.user_profiles
  FOR UPDATE USING (
    user_id IN (
      SELECT id FROM public.users WHERE auth_user_id = auth.uid()
    )
  );

-- 4) SECURITY DEFINER trigger
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
  base_username := COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 8));
  unique_username := base_username;

  WHILE EXISTS (SELECT 1 FROM public.users WHERE username = unique_username) LOOP
    counter := counter + 1;
    unique_username := base_username || '_' || counter;
  END LOOP;

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
    personal_wallet_balance,
    referral_level
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
    0.00,
    'A'
  );

  RETURN NEW;
END
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.create_user_profile_from_auth();

-- 5) Verification
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('users', 'user_profiles')
ORDER BY tablename, policyname;

SELECT id, auth_user_id, username, created_at
FROM public.users
ORDER BY created_at DESC NULLS LAST
LIMIT 5;

SELECT user_id, username
FROM public.user_profiles
ORDER BY user_id DESC
LIMIT 5;

SELECT u.auth_user_id, u.username AS user_username, p.username AS profile_username
FROM public.users u
JOIN public.user_profiles p ON p.user_id = u.id
ORDER BY u.created_at DESC NULLS LAST
LIMIT 5;

-- ============================================================================
-- End of ALL-IN-ONE SIGNUP FIX
-- ============================================================================