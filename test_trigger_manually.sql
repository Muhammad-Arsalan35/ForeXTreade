-- MANUAL TRIGGER TEST AND DIAGNOSIS
-- This script will test the trigger function manually and diagnose issues

-- =====================================================
-- 1. CHECK CURRENT TRIGGER STATUS
-- =====================================================

-- Check if trigger exists
SELECT 
    'TRIGGER STATUS' as check_type,
    trigger_name,
    event_manipulation,
    action_timing,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Check if function exists
SELECT 
    'FUNCTION STATUS' as check_type,
    routine_name,
    routine_type,
    security_type
FROM information_schema.routines 
WHERE routine_name = 'create_user_profile_from_auth';

-- =====================================================
-- 2. CHECK RECENT AUTH USER WITHOUT USER RECORD
-- =====================================================

-- Find the latest auth user without a user record
SELECT 
    'MISSING USER RECORD' as check_type,
    au.id as auth_user_id,
    au.email,
    au.created_at,
    au.raw_user_meta_data
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.auth_user_id
WHERE u.id IS NULL
ORDER BY au.created_at DESC
LIMIT 1;

-- =====================================================
-- 3. MANUALLY EXECUTE TRIGGER FUNCTION
-- =====================================================

-- Get the latest auth user without a user record
DO $$
DECLARE
    latest_auth_user RECORD;
    result_message TEXT;
BEGIN
    -- Get the latest auth user without a user record
    SELECT au.id, au.email, au.raw_user_meta_data, au.created_at
    INTO latest_auth_user
    FROM auth.users au
    LEFT JOIN public.users u ON au.id = u.auth_user_id
    WHERE u.id IS NULL
    ORDER BY au.created_at DESC
    LIMIT 1;
    
    IF latest_auth_user.id IS NOT NULL THEN
        RAISE NOTICE 'Found auth user without user record: % (%)', latest_auth_user.email, latest_auth_user.id;
        
        -- Try to manually execute the trigger function logic
        BEGIN
            -- Check if the function exists and is callable
            PERFORM public.create_user_profile_from_auth();
            RAISE NOTICE 'Function exists but cannot be called directly (trigger function)';
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Function call error: %', SQLERRM;
        END;
        
        -- Manually create the user record using the same logic as the trigger
        DECLARE
            new_username TEXT;
            user_record_id UUID;
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
                latest_auth_user.id,
                COALESCE(latest_auth_user.raw_user_meta_data->>'full_name', ''),
                new_username,
                COALESCE(latest_auth_user.raw_user_meta_data->>'phone_number', ''),
                '',
                'intern'::vip_level_enum,
                'Member',
                'active',
                0.00,
                0.00,
                0.00,
                0.00,
                UPPER(SUBSTRING(MD5(latest_auth_user.id::TEXT), 1, 8)),
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
                COALESCE(latest_auth_user.raw_user_meta_data->>'full_name', ''),
                new_username,
                COALESCE(latest_auth_user.raw_user_meta_data->>'phone_number', ''),
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
            
            RAISE NOTICE 'Manually created user record: % with username: %', user_record_id, new_username;
            
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Manual user creation failed: %', SQLERRM;
        END;
        
    ELSE
        RAISE NOTICE 'No auth users found without user records';
    END IF;
END $$;

-- =====================================================
-- 4. VERIFY TRIGGER PERMISSIONS AND SETUP
-- =====================================================

-- Check trigger permissions
SELECT 
    'TRIGGER PERMISSIONS' as check_type,
    t.trigger_name,
    t.event_object_table,
    t.action_timing,
    t.event_manipulation,
    p.routine_name,
    p.security_type,
    p.definer
FROM information_schema.triggers t
JOIN information_schema.routines p ON t.action_statement LIKE '%' || p.routine_name || '%'
WHERE t.trigger_name = 'on_auth_user_created';

-- =====================================================
-- 5. FINAL VERIFICATION
-- =====================================================

-- Check final counts
SELECT 
    'FINAL VERIFICATION' as check_type,
    'auth.users' as table_name,
    COUNT(*) as record_count
FROM auth.users
UNION ALL
SELECT 
    'FINAL VERIFICATION' as check_type,
    'public.users' as table_name,
    COUNT(*) as record_count
FROM public.users
UNION ALL
SELECT 
    'FINAL VERIFICATION' as check_type,
    'public.user_profiles' as table_name,
    COUNT(*) as record_count
FROM public.user_profiles;

-- Check for any remaining missing records
SELECT 
    'REMAINING MISSING' as check_type,
    COUNT(*) as missing_count
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.auth_user_id
WHERE u.id IS NULL;

SELECT 'Manual trigger test completed!' as status;