-- Simple working trigger - minimal complexity
-- Run this in Supabase SQL Editor

-- 1. Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS create_user_profile_from_auth();

-- 2. Create a simple, robust trigger function
CREATE OR REPLACE FUNCTION create_user_profile_from_auth()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert into users table with minimal data
    INSERT INTO public.users (
        auth_user_id,
        email,
        full_name,
        username,
        vip_level
    ) VALUES (
        NEW.id,
        COALESCE(NEW.email, 'unknown@example.com'),
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
        COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
        'intern'
    );
    
    -- Insert into user_profiles table
    INSERT INTO public.user_profiles (
        user_id,
        membership_type,
        membership_level
    ) VALUES (
        (SELECT id FROM public.users WHERE auth_user_id = NEW.id LIMIT 1),
        'intern',
        'intern'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_profile_from_auth();

-- 4. Test the trigger function manually
SELECT 'Testing simple trigger function...' as info;
DO $$
DECLARE
    test_auth_id uuid := gen_random_uuid();
    test_user_id integer;
BEGIN
    -- Simulate auth user insertion
    INSERT INTO auth.users (
        id,
        email,
        raw_user_meta_data,
        created_at,
        updated_at,
        email_confirmed_at,
        aud,
        role
    ) VALUES (
        test_auth_id,
        'trigger_test@example.com',
        '{"full_name": "Trigger Test", "username": "triggertest"}',
        NOW(),
        NOW(),
        NOW(),
        'authenticated',
        'authenticated'
    );
    
    -- Check if user was created
    SELECT id INTO test_user_id FROM public.users WHERE auth_user_id = test_auth_id;
    
    IF test_user_id IS NOT NULL THEN
        RAISE NOTICE 'SUCCESS: User created with ID %', test_user_id;
        
        -- Check if profile was created
        IF EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = test_user_id) THEN
            RAISE NOTICE 'SUCCESS: User profile created';
        ELSE
            RAISE NOTICE 'ERROR: User profile not created';
        END IF;
        
        -- Clean up
        DELETE FROM public.user_profiles WHERE user_id = test_user_id;
        DELETE FROM public.users WHERE id = test_user_id;
        DELETE FROM auth.users WHERE id = test_auth_id;
        
        RAISE NOTICE 'Test data cleaned up';
    ELSE
        RAISE NOTICE 'ERROR: User not created in users table';
        -- Clean up auth user
        DELETE FROM auth.users WHERE id = test_auth_id;
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ERROR in trigger test: %', SQLERRM;
    -- Clean up on error
    DELETE FROM public.user_profiles WHERE user_id = test_user_id;
    DELETE FROM public.users WHERE auth_user_id = test_auth_id;
    DELETE FROM auth.users WHERE id = test_auth_id;
END $$;

SELECT '✅ Simple trigger created and tested!' as result;