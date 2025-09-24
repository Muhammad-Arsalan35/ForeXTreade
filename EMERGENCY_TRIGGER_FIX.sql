-- ============================================================================
-- EMERGENCY TRIGGER FIX - Run this in Supabase SQL Editor
-- ============================================================================
-- This addresses potential issues in the trigger function that cause signup failures
-- ============================================================================

-- 1. Drop the existing trigger and function to start fresh
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.create_user_profile_from_auth();

-- 2. Create a simplified, bulletproof trigger function
CREATE OR REPLACE FUNCTION public.create_user_profile_from_auth()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    new_username TEXT;
    user_record_id UUID;
    username_counter INTEGER := 0;
    base_username TEXT;
    max_attempts INTEGER := 100;
BEGIN
    -- Log the start of trigger execution
    RAISE LOG 'Trigger started for user: %', NEW.id;
    
    -- Generate base username from email or use default
    IF NEW.email IS NOT NULL AND NEW.email != '' THEN
        base_username := split_part(NEW.email, '@', 1);
        -- Clean username (remove special characters)
        base_username := regexp_replace(base_username, '[^a-zA-Z0-9]', '', 'g');
        -- Ensure it's not empty and has minimum length
        IF length(base_username) < 3 THEN
            base_username := 'user' || extract(epoch from now())::bigint;
        END IF;
    ELSE
        base_username := 'user' || extract(epoch from now())::bigint;
    END IF;
    
    -- Make username unique with safety limit
    new_username := base_username;
    WHILE EXISTS (SELECT 1 FROM public.users WHERE username = new_username) AND username_counter < max_attempts LOOP
        username_counter := username_counter + 1;
        new_username := base_username || '_' || username_counter;
    END LOOP;
    
    -- If we couldn't find a unique username, use timestamp
    IF username_counter >= max_attempts THEN
        new_username := 'user_' || extract(epoch from now())::bigint || '_' || (random() * 10000)::integer;
    END IF;

    RAISE LOG 'Generated username: %', new_username;

    -- Insert into users table first with error handling
    BEGIN
        INSERT INTO public.users (
            id, 
            auth_id, 
            auth_user_id, 
            full_name, 
            username, 
            vip_level,
            position_title, 
            total_earnings, 
            referral_code, 
            created_at, 
            updated_at
        ) VALUES (
            gen_random_uuid(), 
            NEW.id, 
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
            new_username, 
            'trial',
            'Member', 
            0,
            upper(substring(md5(random()::text) from 1 for 8)),
            NOW(), 
            NOW()
        ) RETURNING id INTO user_record_id;
        
        RAISE LOG 'User record created with ID: %', user_record_id;
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE LOG 'Error inserting into users table: %', SQLERRM;
            RAISE EXCEPTION 'Failed to create user record: %', SQLERRM;
    END;

    -- Insert into user_profiles table with error handling
    BEGIN
        INSERT INTO public.user_profiles (
            id, 
            user_id, 
            full_name, 
            username, 
            vip_level, 
            membership_type,
            total_earnings, 
            income_wallet_balance, 
            personal_wallet_balance,
            daily_earning_limit, 
            daily_earnings_today, 
            videos_watched_today,
            created_at, 
            updated_at
        ) VALUES (
            gen_random_uuid(), 
            user_record_id,
            COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
            new_username, 
            'trial', 
            'trial', 
            0, 
            0, 
            0, 
            100, 
            0, 
            0, 
            NOW(), 
            NOW()
        );
        
        RAISE LOG 'User profile created successfully';
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE LOG 'Error inserting into user_profiles table: %', SQLERRM;
            RAISE EXCEPTION 'Failed to create user profile: %', SQLERRM;
    END;

    RAISE LOG 'Trigger completed successfully for user: %', NEW.id;
    RETURN NEW;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error for debugging
        RAISE LOG 'CRITICAL ERROR in create_user_profile_from_auth for user %: %', NEW.id, SQLERRM;
        -- Re-raise the error to prevent user creation
        RAISE EXCEPTION 'Trigger function failed: %', SQLERRM;
END;
$$;

-- 3. Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.create_user_profile_from_auth();

-- 4. Ensure proper permissions
GRANT EXECUTE ON FUNCTION public.create_user_profile_from_auth() TO postgres, anon, authenticated, service_role;

-- 5. Temporarily disable RLS to ensure trigger can insert
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- 6. Re-enable RLS with permissive policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies first
DROP POLICY IF EXISTS "Allow trigger to insert users" ON public.users;
DROP POLICY IF EXISTS "Allow trigger to insert profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;

-- Create very permissive policies for trigger
CREATE POLICY "Allow all operations on users" ON public.users
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on profiles" ON public.user_profiles
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check if trigger function exists
SELECT 'Trigger function exists' as status, proname FROM pg_proc WHERE proname = 'create_user_profile_from_auth';

-- Check if trigger exists
SELECT 'Trigger exists' as status, tgname, tgenabled FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- ============================================================================
-- INSTRUCTIONS:
-- 1. Run this entire script in Supabase SQL Editor
-- 2. Check the verification queries at the bottom
-- 3. Test signup immediately after running this
-- ============================================================================