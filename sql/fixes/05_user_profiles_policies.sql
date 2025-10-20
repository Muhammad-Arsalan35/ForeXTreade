-- ==========================================================================
-- RLS policies to allow profile INSERT via trigger and own updates
-- Run this after 01_users_rls_policies.sql
-- ==========================================================================

-- Ensure RLS is enabled (safe to re-run)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop conflicting policies if they exist
DROP POLICY IF EXISTS "Profiles insert via trigger" ON public.user_profiles;
DROP POLICY IF EXISTS "Profiles update own" ON public.user_profiles;

-- Allow INSERT of profiles (performed by SECURITY DEFINER trigger)
CREATE POLICY "Profiles insert via trigger" ON public.user_profiles
  FOR INSERT
  WITH CHECK (true);

-- Allow authenticated users to update their own profile rows
CREATE POLICY "Profiles update own" ON public.user_profiles
  FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE auth_user_id = auth.uid()
    )
  );