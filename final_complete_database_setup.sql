-- =====================================================
-- FINAL COMPLETE DATABASE SETUP SCRIPT
-- This script includes all fixes and ensures proper trigger functionality
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. DROP EXISTING TRIGGER AND FUNCTION (CLEAN SLATE)
-- =====================================================

-- Drop existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop existing functions
DROP FUNCTION IF EXISTS public.create_user_profile_from_auth() CASCADE;
DROP FUNCTION IF EXISTS public.generate_unique_username() CASCADE;

-- =====================================================
-- 2. CREATE IMPROVED UNIQUE USERNAME GENERATOR
-- =====================================================

CREATE OR REPLACE FUNCTION public.generate_unique_username()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    base_username TEXT;
    final_username TEXT;
    counter INTEGER := 0;
    max_attempts INTEGER := 100;
BEGIN
    -- Generate base username with microseconds for uniqueness
    base_username := 'user_' || EXTRACT(EPOCH FROM NOW())::BIGINT || '_' || 
                     EXTRACT(MICROSECONDS FROM NOW()) || '_' || 
                     FLOOR(RANDOM() * 100000)::INTEGER;
    
    final_username := base_username;
    
    -- Check for uniqueness and add counter if needed
    WHILE EXISTS (SELECT 1 FROM public.users WHERE username = final_username) AND counter < max_attempts LOOP
        counter := counter + 1;
        final_username := base_username || '_' || counter;
    END LOOP;
    
    -- If still not unique after max attempts, add UUID suffix
    IF EXISTS (SELECT 1 FROM public.users WHERE username = final_username) THEN
        final_username := base_username || '_' || REPLACE(uuid_generate_v4()::TEXT, '-', '')::TEXT;
    END IF;
    
    RETURN final_username;
END;
$$;

-- =====================================================
-- 3. CREATE IMPROVED TRIGGER FUNCTION WITH PROPER ERROR HANDLING
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_user_profile_from_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    new_username TEXT;
    user_record_id UUID;
    retry_count INTEGER := 0;
    max_retries INTEGER := 3;
    error_message TEXT;
BEGIN
    -- Log trigger execution
    RAISE NOTICE 'Trigger fired for auth user: %', NEW.id;
    
    -- Retry loop for handling potential conflicts
    WHILE retry_count < max_retries LOOP
        BEGIN
            -- Generate unique username
            new_username := public.generate_unique_username();
            
            -- Insert user record
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
                'intern'::vip_level_enum,
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
            
            -- Success - log and exit
            RAISE NOTICE 'Successfully created user % with username %', user_record_id, new_username;
            EXIT; -- Exit the retry loop
            
        EXCEPTION
            WHEN unique_violation THEN
                retry_count := retry_count + 1;
                error_message := SQLERRM;
                RAISE NOTICE 'Unique violation on attempt %, retrying... Error: %', retry_count, error_message;
                
                IF retry_count >= max_retries THEN
                    RAISE EXCEPTION 'Failed to create user after % attempts. Last error: %', max_retries, error_message;
                END IF;
                
                -- Small delay before retry
                PERFORM pg_sleep(0.1 * retry_count);
                
            WHEN OTHERS THEN
                error_message := SQLERRM;
                RAISE EXCEPTION 'Error creating user profile for auth user %: %', NEW.id, error_message;
        END;
    END LOOP;
    
    RETURN NEW;
END;
$$;

-- =====================================================
-- 4. CREATE TRIGGER ON AUTH.USERS
-- =====================================================

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.create_user_profile_from_auth();

-- =====================================================
-- 5. ENSURE ALL EXISTING AUTH USERS HAVE USER RECORDS
-- =====================================================

DO $$
DECLARE
    auth_user_record RECORD;
    new_username TEXT;
    user_record_id UUID;
    processed_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Processing existing auth users without user records...';
    
    -- Process each auth user that doesn't have a corresponding user record
    FOR auth_user_record IN 
        SELECT au.id, au.email, au.raw_user_meta_data, au.created_at
        FROM auth.users au
        LEFT JOIN public.users u ON au.id = u.auth_user_id
        WHERE u.id IS NULL
        ORDER BY au.created_at ASC
    LOOP
        BEGIN
            -- Generate unique username
            new_username := public.generate_unique_username();
            
            -- Insert user record
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
                'intern'::vip_level_enum,
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
            
            processed_count := processed_count + 1;
            RAISE NOTICE 'Processed auth user % (%) - created user % with username %', 
                         auth_user_record.email, auth_user_record.id, user_record_id, new_username;
            
            -- Small delay to prevent overwhelming the system
            PERFORM pg_sleep(0.05);
            
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Failed to process auth user % (%): %', 
                             auth_user_record.email, auth_user_record.id, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Completed processing % existing auth users', processed_count;
END $$;

-- =====================================================
-- 6. ENSURE ALL USERS HAVE USER PROFILES
-- =====================================================

DO $$
DECLARE
    user_record RECORD;
    processed_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Processing users without user profiles...';
    
    -- Process each user that doesn't have a corresponding user profile
    FOR user_record IN 
        SELECT u.id, u.username, u.full_name, u.phone_number
        FROM public.users u
        LEFT JOIN public.user_profiles up ON u.id = up.user_id
        WHERE up.id IS NULL
        ORDER BY u.created_at ASC
    LOOP
        BEGIN
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
                user_record.id,
                user_record.full_name,
                user_record.username,
                user_record.phone_number,
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
            
            processed_count := processed_count + 1;
            RAISE NOTICE 'Created profile for user % (username: %)', user_record.id, user_record.username;
            
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Failed to create profile for user % (username: %): %', 
                             user_record.id, user_record.username, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Completed processing % users without profiles', processed_count;
END $$;

-- =====================================================
-- 7. VERIFY TRIGGER AND FUNCTION SETUP
-- =====================================================

-- Check trigger exists
SELECT 
    'TRIGGER_STATUS' as check_type,
    trigger_name,
    event_manipulation,
    action_timing,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Check function exists
SELECT 
    'FUNCTION_STATUS' as check_type,
    routine_name,
    routine_type,
    security_type
FROM information_schema.routines 
WHERE routine_name IN ('create_user_profile_from_auth', 'generate_unique_username');

-- =====================================================
-- 8. FINAL VERIFICATION AND STATISTICS
-- =====================================================

-- Count records in each table
SELECT 
    'RECORD_COUNTS' as check_type,
    'auth.users' as table_name,
    COUNT(*) as record_count
FROM auth.users
UNION ALL
SELECT 
    'RECORD_COUNTS' as check_type,
    'public.users' as table_name,
    COUNT(*) as record_count
FROM public.users
UNION ALL
SELECT 
    'RECORD_COUNTS' as check_type,
    'public.user_profiles' as table_name,
    COUNT(*) as record_count
FROM public.user_profiles
UNION ALL
SELECT 
    'RECORD_COUNTS' as check_type,
    'public.task_completions' as table_name,
    COUNT(*) as record_count
FROM public.task_completions;

-- Check for any missing relationships
SELECT 
    'MISSING_RELATIONSHIPS' as check_type,
    'auth_users_without_users' as relationship_type,
    COUNT(*) as missing_count
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.auth_user_id
WHERE u.id IS NULL
UNION ALL
SELECT 
    'MISSING_RELATIONSHIPS' as check_type,
    'users_without_profiles' as relationship_type,
    COUNT(*) as missing_count
FROM public.users u
LEFT JOIN public.user_profiles up ON u.id = up.user_id
WHERE up.id IS NULL;

-- Show latest records for verification
SELECT 
    'LATEST_RECORDS' as check_type,
    'auth.users' as table_name,
    au.id,
    au.email,
    au.created_at
FROM auth.users au
ORDER BY au.created_at DESC
LIMIT 3;

SELECT 
    'LATEST_RECORDS' as check_type,
    'public.users' as table_name,
    u.id,
    u.username,
    u.auth_user_id,
    u.created_at
FROM public.users u
ORDER BY u.created_at DESC
LIMIT 3;

SELECT 
    'LATEST_RECORDS' as check_type,
    'public.user_profiles' as table_name,
    up.id,
    up.username,
    up.user_id,
    up.created_at
FROM public.user_profiles up
ORDER BY up.created_at DESC
LIMIT 3;

SELECT 'Final database setup completed successfully!' as status;