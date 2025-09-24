-- ============================================================================
-- SIMPLE TRIGGER DEBUG - Run this in Supabase SQL Editor
-- ============================================================================
-- This creates a minimal trigger with detailed logging to find the exact issue
-- ============================================================================

-- 1. Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.create_user_profile_from_auth();
DROP FUNCTION IF EXISTS public.create_user_profile_with_logging();

-- 2. Create minimal trigger function with detailed logging
CREATE OR REPLACE FUNCTION public.create_user_profile_from_auth()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    new_user_id UUID;
    simple_username TEXT;
BEGIN
    RAISE NOTICE 'TRIGGER START: Auth User ID = %', NEW.id;
    
    -- Generate simple username
    simple_username := 'user_' || extract(epoch from now())::bigint;
    RAISE NOTICE 'Generated username: %', simple_username;
    
    -- Try minimal insert into users table
    BEGIN
        RAISE NOTICE 'Attempting insert into users table...';
        
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
        
        RAISE NOTICE 'SUCCESS: Inserted user with ID = %', new_user_id;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'ERROR inserting into users: % - %', SQLERRM, SQLSTATE;
        RAISE;
    END;
    
    -- Try minimal insert into user_profiles table
    BEGIN
        RAISE NOTICE 'Attempting insert into user_profiles table...';
        
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
        
        RAISE NOTICE 'SUCCESS: Inserted user_profile';
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'ERROR inserting into user_profiles: % - %', SQLERRM, SQLSTATE;
        RAISE;
    END;

    RAISE NOTICE 'TRIGGER COMPLETED SUCCESSFULLY for user %', NEW.id;
    RETURN NEW;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TRIGGER FAILED: % - %', SQLERRM, SQLSTATE;
    RAISE;
END;
$$;

-- 3. Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.create_user_profile_from_auth();

-- 4. Grant permissions
GRANT EXECUTE ON FUNCTION public.create_user_profile_from_auth() TO postgres, anon, authenticated, service_role;

-- 5. Disable RLS temporarily
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check if trigger function exists
SELECT proname FROM pg_proc WHERE proname = 'create_user_profile_from_auth';

-- Check if trigger exists and is enabled
SELECT tgname, tgenabled FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- ============================================================================
-- INSTRUCTIONS:
-- 1. Run this entire script in Supabase SQL Editor
-- 2. Look for NOTICE messages in the output
-- 3. Test signup immediately after running this
-- 4. The detailed logging will show exactly where the failure occurs
-- ============================================================================