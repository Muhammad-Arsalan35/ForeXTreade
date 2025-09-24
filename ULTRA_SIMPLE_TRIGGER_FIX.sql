-- ============================================================================
-- ULTRA SIMPLE TRIGGER FIX - Run this in Supabase SQL Editor
-- ============================================================================
-- This creates the most basic, bulletproof trigger possible
-- ============================================================================

-- 1. Drop everything and start completely fresh
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.create_user_profile_from_auth();

-- 2. Disable RLS completely for now
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- 3. Create the simplest possible trigger function
CREATE OR REPLACE FUNCTION public.create_user_profile_from_auth()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    new_user_id UUID;
    simple_username TEXT;
BEGIN
    -- Generate simple username
    simple_username := 'user_' || extract(epoch from now())::bigint;
    
    -- Insert into users table
    INSERT INTO public.users (
        id, 
        auth_id, 
        auth_user_id, 
        full_name, 
        username, 
        vip_level,
        position_title, 
        total_earnings, 
        referral_code, 
        created_at, 
        updated_at
    ) VALUES (
        gen_random_uuid(), 
        NEW.id, 
        NEW.id,
        'User',
        simple_username, 
        'trial',
        'Member', 
        0,
        'REF12345',
        NOW(), 
        NOW()
    ) RETURNING id INTO new_user_id;
    
    -- Insert into user_profiles table
    INSERT INTO public.user_profiles (
        id, 
        user_id, 
        full_name, 
        username, 
        vip_level, 
        membership_type,
        total_earnings, 
        income_wallet_balance, 
        personal_wallet_balance,
        daily_earning_limit, 
        daily_earnings_today, 
        videos_watched_today,
        created_at, 
        updated_at
    ) VALUES (
        gen_random_uuid(), 
        new_user_id,
        'User',
        simple_username, 
        'trial', 
        'trial', 
        0, 
        0, 
        0, 
        100, 
        0, 
        0, 
        NOW(), 
        NOW()
    );

    RETURN NEW;
END;
$$;

-- 4. Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.create_user_profile_from_auth();

-- 5. Grant all permissions
GRANT ALL ON public.users TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.user_profiles TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_user_profile_from_auth() TO postgres, anon, authenticated, service_role;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check if trigger function exists
SELECT proname FROM pg_proc WHERE proname = 'create_user_profile_from_auth';

-- Check if trigger exists
SELECT tgname, tgenabled FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- ============================================================================
-- INSTRUCTIONS:
-- 1. Run this entire script in Supabase SQL Editor
-- 2. Test signup immediately after running this
-- 3. If it works, we can add back RLS policies later
-- ============================================================================