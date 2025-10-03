-- ============================================================================
-- Fix: Default new signups to Intern (not VIP1)
-- Location: sql/fixes/fix_signup_default_intern.sql
-- Purpose:
-- - Ensure new users created via Supabase Auth are stored with vip_level = 'intern'
-- - Create/replace the signup trigger to insert a matching Intern profile
-- - Optionally normalize existing users/profiles away from VIP1
-- - Safe to run multiple times
-- ============================================================================

-- 0) Prerequisites used by this script (available on Supabase by default)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1) If a vip_level enum type exists, ensure it contains 'intern' and 'trial'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    WHERE t.typname = 'vip_level_enum'
  ) THEN
    BEGIN
      ALTER TYPE vip_level_enum ADD VALUE IF NOT EXISTS 'Intern';
    EXCEPTION WHEN duplicate_object THEN NULL; END;

    BEGIN
      ALTER TYPE vip_level_enum ADD VALUE IF NOT EXISTS 'Trial';
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END
$$;

-- Ensure new enum labels are committed before use to avoid 55P04
COMMIT;
BEGIN;

-- 2) Normalize existing data (optional but recommended)
--    Move any VIP1 or NULL vip_level to 'intern'
DO $$
BEGIN
  -- If vip_level is an enum, cast safely; otherwise set as text
  -- Also ensure 'Intern' label exists before attempting update
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'vip_level_enum' AND e.enumlabel = 'Intern'
  ) THEN
    RAISE NOTICE 'Skipping vip_level normalization: enum label "intern" not yet committed. Re-run this script after commit.';
  ELSE
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class c ON a.attrelid = c.oid
    JOIN pg_type t ON a.atttypid = t.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND c.relname = 'users'
      AND a.attname = 'vip_level'
      AND t.typname = 'vip_level_enum'
  ) THEN
    UPDATE public.users
    SET vip_level = 'Intern'::vip_level_enum
    WHERE vip_level IS NULL OR vip_level::text IN ('intern', 'Intern');
  ELSE
    UPDATE public.users
    SET vip_level = 'Intern'
    WHERE vip_level IS NULL OR vip_level::text IN ('intern', 'Intern');
  END IF;
  END IF;
END
$$;

--    Ensure profiles show Intern membership by default
UPDATE public.user_profiles
SET membership_type = 'intern',
    membership_level = 'Intern'
WHERE membership_type IS NULL OR membership_type <> 'intern';

-- 2b) Ensure users.vip_level column DEFAULT is Intern (enum/text-safe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class c ON a.attrelid = c.oid
    JOIN pg_type t ON a.atttypid = t.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND c.relname = 'users'
      AND a.attname = 'vip_level'
      AND t.typname = 'vip_level_enum'
  ) THEN
    BEGIN
      ALTER TABLE public.users ALTER COLUMN vip_level SET DEFAULT 'Intern'::vip_level_enum;
    EXCEPTION WHEN undefined_object THEN NULL; END;
  ELSE
    BEGIN
      ALTER TABLE public.users ALTER COLUMN vip_level SET DEFAULT 'Intern';
    EXCEPTION WHEN undefined_object THEN NULL; END;
  END IF;
END
$$;

-- 3) Create (or replace) the trigger function that runs on auth.users insert
--    This writes a row into public.users and a matching row into public.user_profiles
CREATE OR REPLACE FUNCTION public.create_user_profile_from_auth()
RETURNS TRIGGER AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Insert core record into public.users with Intern as default vip_level
  INSERT INTO public.users (
    auth_user_id,
    full_name,
    username,
    phone_number,
    referral_code,
    user_status,
    vip_level
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'phone_number', NEW.raw_user_meta_data->>'phone', NEW.phone),
    UPPER(substr(gen_random_uuid()::text, 1, 8)),
    'active',
    'Intern'
  ) RETURNING id INTO new_user_id;

  -- Insert a minimal profile with Intern membership
  INSERT INTO public.user_profiles (
    user_id,
    full_name,
    username,
    phone_number,
    membership_type,
    membership_level
  ) VALUES (
    new_user_id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'phone_number', NEW.raw_user_meta_data->>'phone', NEW.phone),
    'intern',
    'Intern'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4) Recreate the trigger on auth.users to use the function above
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.create_user_profile_from_auth();

-- 5) Optional grants (trigger runs server-side, but keeping function callable is useful)
GRANT EXECUTE ON FUNCTION public.create_user_profile_from_auth() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_profile_from_auth() TO anon;

-- 6) Verification helpers
--    Run these after signup to confirm Intern defaults
--    (Use Supabase SQL editor to execute)
SELECT 'Recent users (id, username, vip_level)' AS info;
SELECT id, username, vip_level FROM public.users ORDER BY id DESC LIMIT 5;

SELECT 'Recent profiles (user_id, username, membership_type, membership_level)' AS info;
SELECT user_id, username, membership_type, membership_level
FROM public.user_profiles
ORDER BY user_id DESC
LIMIT 5;

SELECT 'Trigger present?' AS info;
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- ============================================================================
-- Usage:
-- 1) Copy the contents into Supabase SQL editor and run.
-- 2) Sign up a new user; they should appear as Intern.
-- 3) Use the verification queries above to confirm.
-- ============================================================================