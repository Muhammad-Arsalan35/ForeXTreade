-- ============================================================================
-- CORRECTED TRIGGER FIX - Matches Actual Table Structure
-- ============================================================================
-- This creates a trigger function that matches the ACTUAL table columns
-- ============================================================================

-- 1. Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.create_user_profile_from_auth();

-- 2. Create corrected trigger function matching actual table structure
CREATE OR REPLACE FUNCTION public.create_user_profile_from_auth()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    new_user_id UUID;
    simple_username TEXT;
    simple_referral_code TEXT;
BEGIN
    -- Generate simple username
    simple_username := 'user_' || extract(epoch from now())::bigint;
    
    -- Generate simple referral code
    simple_referral_code := upper(substring(md5(random()::text) from 1 for 6));
    
    -- Insert into users table with ACTUAL column names
    INSERT INTO public.users (
        id, 
        auth_user_id,  -- This is the correct column name, not auth_id
        full_name, 
        username, 
        vip_level,
        position_title, 
        user_status,
        income_wallet_balance,
        personal_wallet_balance,
        total_earnings, 
        total_invested,
        referral_code,
        referral_level,
        two_factor_enabled,
        login_attempts,
        created_at, 
        updated_at
    ) VALUES (
        gen_random_uuid(), 
        NEW.id,  -- auth_user_id gets the NEW.id from auth.users
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
        simple_username, 
        'trial',
        'Member',
        'active',
        0,
        0,
        0,
        0,
        simple_referral_code,
        0,
        false,
        0,
        NOW(), 
        NOW()
    ) RETURNING id INTO new_user_id;
    
    -- Insert into user_profiles table with ACTUAL column names
    INSERT INTO public.user_profiles (
        id, 
        user_id, 
        full_name, 
        username, 
        membership_type,  -- Keep this as it exists in user_profiles
        membership_level, -- This is the actual column name
        vip_level,
        videos_watched_today,
        total_earnings, 
        income_wallet_balance, 
        personal_wallet_balance,
        daily_earning_limit, 
        daily_earnings_today,
        intern_trial_start_date,
        intern_trial_end_date,
        intern_trial_expired,
        days_remaining,
        created_at, 
        updated_at
    ) VALUES (
        gen_random_uuid(), 
        new_user_id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
        simple_username, 
        'trial',
        'trial',
        'trial',
        0,
        0, 
        0, 
        0, 
        100, 
        0,
        NOW(),
        NOW() + INTERVAL '30 days',
        false,
        30,
        NOW(), 
        NOW()
    );

    RETURN NEW;
END;
$$;

-- 3. Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.create_user_profile_from_auth();

-- 4. Grant permissions
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
-- ============================================================================