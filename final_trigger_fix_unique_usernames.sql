-- FINAL TRIGGER FIX WITH UNIQUE USERNAME GENERATION
-- This script fixes the duplicate username issue and ensures proper trigger functionality

-- =====================================================
-- 1. CHECK CURRENT STATE
-- =====================================================

-- Check enum values first
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

-- =====================================================
-- 2. DROP AND RECREATE TRIGGER WITH UNIQUE USERNAME LOGIC
-- =====================================================

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.create_user_profile_from_auth();

-- Create function to generate unique username
CREATE OR REPLACE FUNCTION public.generate_unique_username()
RETURNS TEXT AS $$
DECLARE
    base_username TEXT;
    final_username TEXT;
    counter INTEGER := 0;
    max_attempts INTEGER := 100;
BEGIN
    -- Generate base username with microseconds for better uniqueness
    base_username := 'user_' || EXTRACT(EPOCH FROM NOW())::BIGINT || '_' || EXTRACT(MICROSECONDS FROM NOW());
    final_username := base_username;
    
    -- Check if username exists and increment if needed
    WHILE EXISTS (SELECT 1 FROM public.users WHERE username = final_username) AND counter < max_attempts LOOP
        counter := counter + 1;
        final_username := base_username || '_' || counter;
    END LOOP;
    
    -- If we still have a conflict after max attempts, use UUID
    IF EXISTS (SELECT 1 FROM public.users WHERE username = final_username) THEN
        final_username := 'user_' || REPLACE(gen_random_uuid()::TEXT, '-', '');
    END IF;
    
    RETURN final_username;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the main trigger function with robust error handling
CREATE OR REPLACE FUNCTION public.create_user_profile_from_auth()
RETURNS TRIGGER AS $$
DECLARE
    new_username TEXT;
    user_record_id UUID;
    error_message TEXT;
    retry_count INTEGER := 0;
    max_retries INTEGER := 3;
BEGIN
    -- Log the trigger execution
    RAISE NOTICE 'Trigger fired for auth user: %', NEW.id;
    
    -- Check if user already exists
    IF EXISTS (SELECT 1 FROM public.users WHERE auth_user_id = NEW.id) THEN
        RAISE NOTICE 'User already exists for auth_user_id: %', NEW.id;
        RETURN NEW;
    END IF;
    
    -- Retry loop for username generation and user creation
    WHILE retry_count < max_retries LOOP
        BEGIN
            -- Generate unique username
            new_username := public.generate_unique_username();
            
            -- Insert into public.users table
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
            
            RAISE NOTICE 'User record created with ID: % and username: %', user_record_id, new_username;
            
            -- Exit retry loop on success
            EXIT;
            
        EXCEPTION
            WHEN unique_violation THEN
                retry_count := retry_count + 1;
                RAISE NOTICE 'Username conflict, retrying... (attempt %/%)', retry_count, max_retries;
                IF retry_count >= max_retries THEN
                    RAISE WARNING 'Failed to create user after % attempts due to username conflicts', max_retries;
                    RETURN NEW;
                END IF;
                -- Small delay before retry
                PERFORM pg_sleep(0.01);
            WHEN OTHERS THEN
                error_message := SQLERRM;
                RAISE WARNING 'Error creating user record: %', error_message;
                RETURN NEW;
        END;
    END LOOP;
    
    -- Insert into public.user_profiles table
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
-- 3. MANUALLY FIX EXISTING AUTH USERS (ONE BY ONE)
-- =====================================================

-- Create user records for auth users that don't have them (one by one to avoid conflicts)
DO $$
DECLARE
    auth_user_record RECORD;
    new_username TEXT;
    user_record_id UUID;
    processed_count INTEGER := 0;
BEGIN
    -- Process auth users without user records one by one
    FOR auth_user_record IN 
        SELECT au.id, au.email, au.raw_user_meta_data, au.created_at
        FROM auth.users au
        LEFT JOIN public.users u ON au.id = u.auth_user_id
        WHERE u.id IS NULL
        ORDER BY au.created_at DESC
        LIMIT 10
    LOOP
        BEGIN
            -- Generate unique username using the function
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
            RAISE NOTICE 'Fixed auth user % (%) -> user ID: % with username: %', 
                auth_user_record.email, auth_user_record.id, user_record_id, new_username;
            
            -- Small delay to ensure uniqueness
            PERFORM pg_sleep(0.01);
            
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Failed to fix auth user %: %', auth_user_record.email, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Processed % auth users', processed_count;
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

-- Show recent user records to verify they were created
SELECT 
    'RECENT USER RECORDS' as check_type,
    u.username,
    u.auth_user_id,
    u.created_at,
    au.email
FROM public.users u
JOIN auth.users au ON u.auth_user_id = au.id
ORDER BY u.created_at DESC
LIMIT 5;

SELECT 'Final trigger fix with unique usernames completed!' as status;