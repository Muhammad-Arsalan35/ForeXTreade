-- ==========================================================================
-- USERS + USER_PROFILES RLS POLICIES (Minimal set to unblock signup/login)
-- Run this in Supabase SQL Editor
-- ==========================================================================

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (safe to re-run)
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Allow user creation during signup" ON public.users;
DROP POLICY IF EXISTS "Users can view other users for referrals" ON public.users;

DROP POLICY IF EXISTS "Profiles read own" ON public.user_profiles;

-- Users: read own row
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = auth_user_id);

-- Users: update own row
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = auth_user_id);

-- Users: allow insert during signup (trigger inserts will populate row)
CREATE POLICY "Allow user creation during signup" ON public.users
  FOR INSERT WITH CHECK (true);

-- Users: allow authenticated users to read other users (for referrals/team lookups)
CREATE POLICY "Users can view other users for referrals" ON public.users
  FOR SELECT USING (auth.role() = 'authenticated');

-- User profiles: read own via mapping from users.auth_user_id
CREATE POLICY "Profiles read own" ON public.user_profiles
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM public.users WHERE auth_user_id = auth.uid()
    )
  );

-- Note: insert into user_profiles will be done by a SECURITY DEFINER trigger
-- so we do not need a permissive INSERT policy here.