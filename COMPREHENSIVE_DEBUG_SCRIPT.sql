-- ============================================================================
-- COMPREHENSIVE DEBUG SCRIPT - Run this in Supabase SQL Editor
-- ============================================================================
-- This script includes detailed logging, table structure checks, and manual testing
-- ============================================================================

-- 1. CREATE A DETAILED LOGGING FUNCTION FOR DEBUGGING 
CREATE OR REPLACE FUNCTION public.create_user_profile_with_logging() 
RETURNS TRIGGER 
SECURITY DEFINER 
LANGUAGE plpgsql 
AS $$ 
DECLARE 
    new_user_id UUID; 
    simple_username TEXT; 
    step_counter INT := 0; 
BEGIN 
    -- Log start 
    RAISE NOTICE 'TRIGGER START: User ID = %', NEW.id; 
    
    step_counter := 1; 
    RAISE NOTICE 'Step %: Generating username', step_counter; 
    
    -- Generate simple username 
    simple_username := 'user_' || extract(epoch from now())::bigint; 
    RAISE NOTICE 'Step %: Generated username = %', step_counter, simple_username; 
    
    step_counter := 2; 
    RAISE NOTICE 'Step %: Inserting into users table', step_counter; 
    
    -- Insert into users table with error handling 
    BEGIN 
        INSERT INTO public.users ( 
            id, 
            auth_user_id, 
            full_name, 
            username, 
            user_status,
            total_invested,
            created_at, 
            updated_at 
        ) VALUES ( 
            gen_random_uuid(), 
            NEW.id, 
            'User', 
            simple_username, 
            'active',
            0,
            NOW(), 
            NOW() 
        ) RETURNING id INTO new_user_id; 
        
        RAISE NOTICE 'Step %: Successfully inserted user with ID = %', step_counter, new_user_id; 
        
    EXCEPTION WHEN OTHERS THEN 
        RAISE NOTICE 'ERROR in step %: % - %', step_counter, SQLERRM, SQLSTATE; 
        RAISE; 
    END; 
    
    step_counter := 3; 
    RAISE NOTICE 'Step %: Inserting into user_profiles table', step_counter; 
    
    -- Insert into user_profiles table with error handling 
    BEGIN 
        INSERT INTO public.user_profiles ( 
            id, 
            user_id, 
            full_name, 
            username, 
            membership_level,
            created_at, 
            updated_at 
        ) VALUES ( 
            gen_random_uuid(), 
            new_user_id, 
            'User', 
            simple_username, 
            'trial',
            NOW(), 
            NOW() 
        ); 
        
        RAISE NOTICE 'Step %: Successfully inserted user_profile', step_counter; 
        
    EXCEPTION WHEN OTHERS THEN 
        RAISE NOTICE 'ERROR in step %: % - %', step_counter, SQLERRM, SQLSTATE; 
        RAISE; 
    END; 

    RAISE NOTICE 'TRIGGER SUCCESS: All steps completed for user %', NEW.id; 
    RETURN NEW; 
    
EXCEPTION WHEN OTHERS THEN 
    RAISE NOTICE 'TRIGGER FAILED: % - %', SQLERRM, SQLSTATE; 
    RAISE; 
END; 
$$; 

-- 2. REPLACE THE TRIGGER WITH THE LOGGING VERSION 
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users; 

CREATE TRIGGER on_auth_user_created 
    AFTER INSERT ON auth.users 
    FOR EACH ROW 
    EXECUTE FUNCTION public.create_user_profile_with_logging(); 

-- 
-- 3. COMPREHENSIVE TABLE AND PERMISSION CHECKS 
-- 

-- Check table structures 
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable, 
    column_default 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'user_profiles') 
ORDER BY table_name, ordinal_position; 

-- Check constraints that might be blocking inserts 
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type, 
    kcu.column_name 
FROM information_schema.table_constraints tc 
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name 
WHERE tc.table_schema = 'public' 
AND tc.table_name IN ('users', 'user_profiles') 
AND tc.constraint_type IN ('PRIMARY KEY', 'FOREIGN KEY', 'UNIQUE', 'CHECK'); 

-- Check RLS status 
SELECT 
    tablename, 
    rowsecurity as rls_enabled, 
    (SELECT count(*) FROM pg_policy WHERE polrelid = c.oid) as policy_count 
FROM pg_tables t 
JOIN pg_class c ON c.relname = t.tablename 
WHERE t.schemaname = 'public' 
AND t.tablename IN ('users', 'user_profiles'); 

-- Check function permissions 
SELECT 
    p.proname as function_name, 
    pg_get_function_identity_arguments(p.oid) as arguments, 
    p.prosecdef as security_definer, 
    array_to_string(p.proacl, ', ') as permissions 
FROM pg_proc p 
WHERE p.proname LIKE '%user_profile%'; 

-- Check trigger status 
SELECT 
    t.tgname as trigger_name, 
    c.relname as table_name, 
    p.proname as function_name, 
    CASE t.tgenabled 
        WHEN 'O' THEN 'enabled' 
        WHEN 'D' THEN 'disabled' 
        WHEN 'R' THEN 'replica_only' 
        WHEN 'A' THEN 'always' 
        ELSE 'unknown' 
    END as status 
FROM pg_trigger t 
JOIN pg_class c ON t.tgrelid = c.oid 
JOIN pg_proc p ON t.tgfoid = p.oid 
WHERE t.tgname = 'on_auth_user_created'; 

-- 
-- 4. MANUAL TEST TO SEE IF TABLES ARE WRITABLE 
-- 
DO $$ 
DECLARE 
    test_user_id UUID := gen_random_uuid(); 
    test_auth_id UUID := gen_random_uuid(); 
BEGIN 
    RAISE NOTICE 'Testing manual insert into users table...'; 
    
    BEGIN
        INSERT INTO public.users ( 
            id, auth_user_id, full_name, username, 
            user_status, total_invested, created_at, updated_at 
        ) VALUES ( 
            test_user_id, test_auth_id, 
            'Test User', 'test_manual_user', 
            'active', 0, NOW(), NOW() 
        ); 
        
        RAISE NOTICE 'SUCCESS: Manual insert into users table worked'; 
        
        -- Test user_profiles insert
        RAISE NOTICE 'Testing manual insert into user_profiles table...';
        
        INSERT INTO public.user_profiles ( 
            id, user_id, full_name, username, 
            membership_level, created_at, updated_at 
        ) VALUES ( 
            gen_random_uuid(), test_user_id, 
            'Test User', 'test_manual_user', 
            'trial', NOW(), NOW() 
        ); 
        
        RAISE NOTICE 'SUCCESS: Manual insert into user_profiles table worked'; 
        
        -- Clean up test data 
        DELETE FROM public.user_profiles WHERE user_id = test_user_id;
        DELETE FROM public.users WHERE id = test_user_id; 
        
        RAISE NOTICE 'SUCCESS: Test data cleaned up successfully';
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'ERROR in manual test: % - %', SQLERRM, SQLSTATE;
        -- Try to clean up even if there was an error
        BEGIN
            DELETE FROM public.user_profiles WHERE user_id = test_user_id;
            DELETE FROM public.users WHERE id = test_user_id;
        EXCEPTION WHEN OTHERS THEN
            -- Ignore cleanup errors
        END;
    END;
END; 
$$;

-- 5. GRANT COMPREHENSIVE PERMISSIONS
GRANT ALL ON public.users TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.user_profiles TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_user_profile_with_logging() TO postgres, anon, authenticated, service_role;

-- 6. DISABLE RLS TEMPORARILY FOR TESTING
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify trigger function exists
SELECT proname, prosecdef FROM pg_proc WHERE proname = 'create_user_profile_with_logging';

-- Verify trigger exists and is enabled
SELECT tgname, tgenabled FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Show current table structures
\d public.users;
\d public.user_profiles;

-- ============================================================================
-- INSTRUCTIONS:
-- 1. Run this entire script in Supabase SQL Editor
-- 2. Look for NOTICE messages in the output - they will show detailed logging
-- 3. Check for any ERROR messages that indicate the specific problem
-- 4. Test signup immediately after running this
-- 5. The trigger will now log every step, making it easy to see where it fails
-- ============================================================================