-- ============================================================================
-- FINAL SIGNUP FIX - Run this in Supabase SQL Editor
-- ============================================================================
-- This script will fix the "Database error saving new user" issue
-- ============================================================================

-- 1. First, let's ensure the tables have the correct structure
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS vip_level TEXT DEFAULT 'trial';

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS vip_level TEXT DEFAULT 'trial';

-- 2. Create or replace the trigger function with proper error handling
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
BEGIN
    -- Generate base username from email or use default
    IF NEW.email IS NOT NULL THEN
        base_username := split_part(NEW.email, '@', 1);
        -- Clean username (remove special characters)
        base_username := regexp_replace(base_username, '[^a-zA-Z0-9]', '', 'g');
        -- Ensure it's not empty
        IF length(base_username) < 3 THEN
            base_username := 'user';
        END IF;
    ELSE
        base_username := 'user';
    END IF;
    
    -- Make username unique
    new_username := base_username;
    WHILE EXISTS (SELECT 1 FROM public.users WHERE username = new_username) LOOP
        username_counter := username_counter + 1;
        new_username := base_username || '_' || username_counter;
    END LOOP;

    -- Insert into users table first
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

    -- Insert into user_profiles table
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

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error for debugging
        RAISE LOG 'Error in create_user_profile_from_auth for user %: %', NEW.id, SQLERRM;
        -- Re-raise the error to prevent user creation
        RAISE;
END;
$$;

-- 3. Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 4. Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.create_user_profile_from_auth();

-- 5. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- 6. Ensure RLS policies allow the trigger to work
-- Temporarily disable RLS for users table
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS with proper policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies that allow the trigger to insert
DROP POLICY IF EXISTS "Allow trigger to insert users" ON public.users;
CREATE POLICY "Allow trigger to insert users" ON public.users
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow trigger to insert profiles" ON public.user_profiles;
CREATE POLICY "Allow trigger to insert profiles" ON public.user_profiles
    FOR INSERT WITH CHECK (true);

-- Allow users to read their own data
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
CREATE POLICY "Users can read own data" ON public.users
    FOR SELECT USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
CREATE POLICY "Users can read own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = (SELECT auth_user_id FROM public.users WHERE id = user_id));

-- Allow users to update their own data
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
CREATE POLICY "Users can update own data" ON public.users
    FOR UPDATE USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = (SELECT auth_user_id FROM public.users WHERE id = user_id));

-- ============================================================================
-- VERIFICATION QUERIES (Run these after the above to check if it worked)
-- ============================================================================

-- Check if trigger function exists
SELECT proname, prosrc FROM pg_proc WHERE proname = 'create_user_profile_from_auth';

-- Check if trigger exists
SELECT tgname, tgenabled FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Check table structures
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' AND table_schema = 'public'
ORDER BY ordinal_position;

-- ============================================================================
-- INSTRUCTIONS:
-- 1. Copy and paste this entire script into Supabase SQL Editor
-- 2. Run it all at once
-- 3. Check the verification queries at the bottom
-- 4. Test signup in your application
-- ============================================================================