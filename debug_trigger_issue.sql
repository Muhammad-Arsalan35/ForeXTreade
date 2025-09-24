-- Debug script to check trigger status and identify issues
-- Run this in Supabase SQL Editor

-- 1. Check if the trigger function exists
SELECT 'Checking trigger function...' as info;
SELECT 
    proname as function_name,
    prosrc as function_body
FROM pg_proc 
WHERE proname = 'create_user_profile_from_auth';

-- 2. Check if the trigger exists
SELECT 'Checking trigger...' as info;
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- 3. Check the vip_level_enum values
SELECT 'Checking vip_level_enum values...' as info;
SELECT enumlabel as vip_level_values 
FROM pg_enum 
WHERE enumtypid = (
    SELECT oid 
    FROM pg_type 
    WHERE typname = 'vip_level_enum'
);

-- 4. Check table structures
SELECT 'Checking users table structure...' as info;
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'Checking user_profiles table structure...' as info;
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. Test the trigger function manually (if it exists)
SELECT 'Testing trigger function manually...' as info;
DO $$
DECLARE
    test_user_id uuid := gen_random_uuid();
    test_email text := 'manual_test@example.com';
    test_metadata jsonb := '{"full_name": "Manual Test", "username": "manualtest"}';
BEGIN
    -- Try to call the function manually
    BEGIN
        PERFORM create_user_profile_from_auth();
        RAISE NOTICE 'Trigger function exists and can be called';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error calling trigger function: %', SQLERRM;
    END;
END $$;

-- 6. Check for any constraints that might be failing
SELECT 'Checking constraints...' as info;
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid IN (
    SELECT oid FROM pg_class WHERE relname IN ('users', 'user_profiles')
);

SELECT '✅ Debug information collected!' as result;