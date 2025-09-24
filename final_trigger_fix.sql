-- Final trigger fix - corrected version
-- Run this in Supabase SQL Editor

-- 1. Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS create_user_profile_from_auth();

-- 2. Create the corrected trigger function
CREATE OR REPLACE FUNCTION create_user_profile_from_auth()
RETURNS TRIGGER AS $$
DECLARE
    user_full_name TEXT;
    user_username TEXT;
BEGIN
    -- Extract metadata
    user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'User');
    user_username := COALESCE(NEW.raw_user_meta_data->>'username', 'user' || substr(NEW.id::text, 1, 8));
    
    -- Insert into users table with explicit vip_level
    INSERT INTO public.users (
        auth_user_id,
        email,
        full_name,
        username,
        vip_level,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        user_full_name,
        user_username,
        'intern'::vip_level_enum,  -- Explicit enum casting
        NOW(),
        NOW()
    );
    
    -- Insert into user_profiles table
    INSERT INTO public.user_profiles (
        user_id,
        membership_type,
        membership_level,
        created_at,
        updated_at
    ) VALUES (
        (SELECT id FROM public.users WHERE auth_user_id = NEW.id),
        'intern',
        'intern',
        NOW(),
        NOW()
    );
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log the error for debugging
    RAISE LOG 'Error in create_user_profile_from_auth: %', SQLERRM;
    -- Re-raise the error to prevent user creation
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_profile_from_auth();

-- 4. Verify the setup
SELECT 'Checking if trigger function exists...' as info;
SELECT proname as function_name
FROM pg_proc 
WHERE proname = 'create_user_profile_from_auth';

SELECT 'Checking if trigger exists...' as info;
SELECT trigger_name
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

SELECT '✅ Final trigger fix applied successfully!' as result;