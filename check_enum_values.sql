-- CHECK ENUM VALUES AND FIX TRIGGER
-- This script will check the enum values and fix the trigger

-- =====================================================
-- 1. CHECK ENUM VALUES
-- =====================================================

-- Check what enum values are available for vip_level_enum
SELECT 
    'VIP_LEVEL_ENUM VALUES' as check_type,
    enumlabel as enum_value
FROM pg_enum 
WHERE enumtypid = (
    SELECT oid 
    FROM pg_type 
    WHERE typname = 'vip_level_enum'
)
ORDER BY enumsortorder;

-- Check the users table structure to see the vip_level column
SELECT 
    'USERS TABLE STRUCTURE' as check_type,
    column_name,
    data_type,
    udt_name,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'users' 
AND column_name = 'vip_level';

-- =====================================================
-- 2. FIX THE TRIGGER FUNCTION WITH CORRECT ENUM VALUES
-- =====================================================

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.create_user_profile_from_auth();

-- Create corrected function with proper enum casting
CREATE OR REPLACE FUNCTION public.create_user_profile_from_auth()
RETURNS TRIGGER AS $$
DECLARE
    new_username TEXT;
    user_record_id UUID;
    error_message TEXT;
BEGIN
    -- Log the trigger execution
    RAISE NOTICE 'Trigger fired for auth user: %', NEW.id;
    
    -- Generate a unique username
    new_username := 'user_' || EXTRACT(EPOCH FROM NOW())::BIGINT;
    
    -- Insert into public.users table with error handling
    BEGIN
        INSERT INTO public.users (
            auth_user_id,
            full_name,
            username,
            phone_number,
            profile_avatar,
            vip_level,
            position_title,
            user_status,
            income_wallet_balance,
            personal_wallet_balance,
            total_earnings,
            total_invested,
            referral_code,
            referred_by,
            referral_level,
            two_factor_enabled,
            two_factor_secret,
            last_login,
            login_attempts,
            account_locked_until,
            created_at,
            updated_at
        ) VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
            new_username,
            COALESCE(NEW.raw_user_meta_data->>'phone_number', ''),
            '',
            'intern'::vip_level_enum,  -- Use enum value instead of integer
            'Member',
            'active',
            0.00,
            0.00,
            0.00,
            0.00,
            UPPER(SUBSTRING(MD5(NEW.id::TEXT), 1, 8)),
            NULL,
            1,
            FALSE,
            NULL,
            NOW(),
            0,
            NULL,
            NOW(),
            NOW()
        ) RETURNING id INTO user_record_id;
        
        RAISE NOTICE 'User record created with ID: %', user_record_id;
        
    EXCEPTION
        WHEN OTHERS THEN
            error_message := SQLERRM;
            RAISE WARNING 'Error creating user record: %', error_message;
            RETURN NEW; -- Don't fail the auth process
    END;
    
    -- Insert into public.user_profiles table with error handling
    BEGIN
        INSERT INTO public.user_profiles (
            user_id,
            full_name,
            username,
            phone_number,
            membership_type,
            membership_level,
            intern_trial_start_date,
            intern_trial_end_date,
            intern_trial_expired,
            days_remaining,
            videos_watched_today,
            last_video_reset_date,
            total_earnings,
            income_wallet_balance,
            personal_wallet_balance,
            daily_earning_limit,
            daily_earnings_today,
            last_earning_reset_date,
            created_at,
            updated_at
        ) VALUES (
            user_record_id,
            COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
            new_username,
            COALESCE(NEW.raw_user_meta_data->>'phone_number', ''),
            'intern',
            1,
            NOW(),
            NOW() + INTERVAL '7 days',
            FALSE,
            7,
            0,
            NOW(),
            0.00,
            0.00,
            0.00,
            100.00,
            0.00,
            NOW(),
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'User profile created for user ID: %', user_record_id;
        
    EXCEPTION
        WHEN OTHERS THEN
            error_message := SQLERRM;
            RAISE WARNING 'Error creating user profile: %', error_message;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.create_user_profile_from_auth();

-- =====================================================
-- 3. MANUALLY FIX EXISTING AUTH USERS WITH CORRECT ENUM
-- =====================================================

-- Create user records for auth users that don't have them
DO $$
DECLARE
    auth_user_record RECORD;
    new_username TEXT;
    user_record_id UUID;
BEGIN
    -- Loop through auth users without user records
    FOR auth_user_record IN 
        SELECT au.id, au.email, au.raw_user_meta_data
        FROM auth.users au
        LEFT JOIN public.users u ON au.id = u.auth_user_id
        WHERE u.id IS NULL
        ORDER BY au.created_at DESC
        LIMIT 10
    LOOP
        -- Generate username
        new_username := 'user_' || EXTRACT(EPOCH FROM NOW())::BIGINT;
        
        -- Insert user record with correct enum casting
        INSERT INTO public.users (
            auth_user_id,
            full_name,
            username,
            phone_number,
            profile_avatar,
            vip_level,
            position_title,
            user_status,
            income_wallet_balance,
            personal_wallet_balance,
            total_earnings,
            total_invested,
            referral_code,
            referred_by,
            referral_level,
            two_factor_enabled,
            two_factor_secret,
            last_login,
            login_attempts,
            account_locked_until,
            created_at,
            updated_at
        ) VALUES (
            auth_user_record.id,
            COALESCE(auth_user_record.raw_user_meta_data->>'full_name', ''),
            new_username,
            COALESCE(auth_user_record.raw_user_meta_data->>'phone_number', ''),
            '',
            'intern'::vip_level_enum,  -- Use enum value instead of integer
            'Member',
            'active',
            0.00,
            0.00,
            0.00,
            0.00,
            UPPER(SUBSTRING(MD5(auth_user_record.id::TEXT), 1, 8)),
            NULL,
            1,
            FALSE,
            NULL,
            NOW(),
            0,
            NULL,
            NOW(),
            NOW()
        ) RETURNING id INTO user_record_id;
        
        -- Insert user profile
        INSERT INTO public.user_profiles (
            user_id,
            full_name,
            username,
            phone_number,
            membership_type,
            membership_level,
            intern_trial_start_date,
            intern_trial_end_date,
            intern_trial_expired,
            days_remaining,
            videos_watched_today,
            last_video_reset_date,
            total_earnings,
            income_wallet_balance,
            personal_wallet_balance,
            daily_earning_limit,
            daily_earnings_today,
            last_earning_reset_date,
            created_at,
            updated_at
        ) VALUES (
            user_record_id,
            COALESCE(auth_user_record.raw_user_meta_data->>'full_name', ''),
            new_username,
            COALESCE(auth_user_record.raw_user_meta_data->>'phone_number', ''),
            'intern',
            1,
            NOW(),
            NOW() + INTERVAL '7 days',
            FALSE,
            7,
            0,
            NOW(),
            0.00,
            0.00,
            0.00,
            100.00,
            0.00,
            NOW(),
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Fixed auth user: % (%) -> user ID: %', auth_user_record.email, auth_user_record.id, user_record_id;
        
        -- Small delay to ensure unique usernames
        PERFORM pg_sleep(0.001);
    END LOOP;
END $$;

-- =====================================================
-- 4. FINAL VERIFICATION
-- =====================================================

-- Show final counts
SELECT 
    'FINAL COUNTS' as check_type,
    'auth.users' as table_name,
    COUNT(*) as record_count
FROM auth.users
UNION ALL
SELECT 
    'FINAL COUNTS' as check_type,
    'public.users' as table_name,
    COUNT(*) as record_count
FROM public.users
UNION ALL
SELECT 
    'FINAL COUNTS' as check_type,
    'public.user_profiles' as table_name,
    COUNT(*) as record_count
FROM public.user_profiles;

-- Check if all auth users now have user records
SELECT 
    'MISSING RECORDS AFTER FIX' as check_type,
    COUNT(*) as missing_count
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.auth_user_id
WHERE u.id IS NULL;

-- Verify the trigger exists
SELECT 
    'TRIGGER VERIFICATION' as check_type,
    trigger_name,
    event_manipulation,
    event_object_table
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

SELECT 'Enum-corrected trigger fix completed!' as status;