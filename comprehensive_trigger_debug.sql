-- Comprehensive trigger debugging script
-- Run this in Supabase SQL Editor

-- 1. Check if tables exist
SELECT 'Checking if tables exist...' as info;
SELECT 
    schemaname,
    tablename
FROM pg_tables 
WHERE tablename IN ('users', 'user_profiles') 
AND schemaname = 'public';

-- 2. Check table structures in detail
SELECT 'Users table structure:' as info;
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'User_profiles table structure:' as info;
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check enum types
SELECT 'Checking vip_level_enum:' as info;
SELECT enumlabel as enum_values 
FROM pg_enum 
WHERE enumtypid = (
    SELECT oid 
    FROM pg_type 
    WHERE typname = 'vip_level_enum'
);

-- 4. Check constraints
SELECT 'Checking constraints:' as info;
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_name IN ('users', 'user_profiles')
    AND tc.table_schema = 'public';

-- 5. Check trigger function source
SELECT 'Trigger function source:' as info;
SELECT 
    proname as function_name,
    prosrc as function_source
FROM pg_proc 
WHERE proname = 'create_user_profile_from_auth';

-- 6. Check trigger
SELECT 'Trigger details:' as info;
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement,
    action_orientation
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- 7. Test manual insertion to identify the exact error
SELECT 'Testing manual insertion...' as info;
DO $$
DECLARE
    test_auth_id uuid := gen_random_uuid();
    test_user_id integer;
BEGIN
    -- Try to insert into users table manually
    BEGIN
        INSERT INTO public.users (
            auth_user_id,
            email,
            full_name,
            username,
            vip_level,
            created_at,
            updated_at
        ) VALUES (
            test_auth_id,
            'manual_test@example.com',
            'Manual Test User',
            'manualtest',
            'intern'::vip_level_enum,
            NOW(),
            NOW()
        ) RETURNING id INTO test_user_id;
        
        RAISE NOTICE 'Successfully inserted user with ID: %', test_user_id;
        
        -- Try to insert into user_profiles
        INSERT INTO public.user_profiles (
            user_id,
            membership_type,
            membership_level,
            created_at,
            updated_at
        ) VALUES (
            test_user_id,
            'intern',
            'intern',
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Successfully inserted user profile';
        
        -- Clean up test data
        DELETE FROM public.user_profiles WHERE user_id = test_user_id;
        DELETE FROM public.users WHERE id = test_user_id;
        
        RAISE NOTICE 'Test data cleaned up successfully';
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error during manual insertion: %', SQLERRM;
    END;
END $$;

SELECT '✅ Comprehensive debug completed!' as result;