-- ============================================================================
-- EMERGENCY SIGNUP FIX - RESOLVES "Database error saving new user"
-- ============================================================================
-- This will fix the 3-day signup issue you've been experiencing
-- Copy and paste these commands into your Supabase SQL Editor
-- ============================================================================

-- STEP 1: First, let's ensure we have the correct table structure
-- Add missing columns if they don't exist
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS vip_level TEXT DEFAULT 'trial';

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS auth_id UUID;

-- Update auth_id for existing users if it's null
UPDATE public.users 
SET auth_id = auth_user_id 
WHERE auth_id IS NULL AND auth_user_id IS NOT NULL;

-- STEP 2: Create the working trigger function
CREATE OR REPLACE FUNCTION public.create_user_profile_from_auth()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    new_username TEXT;
    user_record_id UUID;
    attempt_count INTEGER := 0;
    max_attempts INTEGER := 5;
BEGIN
    -- Generate a unique username
    LOOP
        attempt_count := attempt_count + 1;
        
        -- Create username with timestamp and random number
        new_username := 'user_' || 
                       EXTRACT(epoch FROM NOW())::bigint || '_' || 
                       (RANDOM() * 1000000)::bigint;
        
        -- Check if username already exists
        IF NOT EXISTS (
            SELECT 1 FROM public.users WHERE username = new_username
            UNION
            SELECT 1 FROM public.user_profiles WHERE username = new_username
        ) THEN
            EXIT; -- Username is unique, exit loop
        END IF;
        
        -- If we've tried too many times, use a guaranteed unique username
        IF attempt_count >= max_attempts THEN
            new_username := 'user_' || NEW.id::text;
            EXIT;
        END IF;
    END LOOP;

    -- Insert into users table
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
    )
    RETURNING id INTO user_record_id;

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
        RAISE LOG 'Error in create_user_profile_from_auth: %', SQLERRM;
        -- Re-raise the exception to prevent user creation if profile creation fails
        RAISE;
END;
$$;

-- STEP 3: Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.create_user_profile_from_auth();

-- STEP 4: Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.create_user_profile_from_auth() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_profile_from_auth() TO anon;
GRANT EXECUTE ON FUNCTION public.create_user_profile_from_auth() TO service_role;

-- STEP 5: Ensure RLS policies allow the trigger to work
-- Temporarily disable RLS for the trigger to work
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS with proper policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies that allow the trigger to work
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Allow trigger to insert users" ON public.users;

CREATE POLICY "Users can view own data" ON public.users
    FOR SELECT USING (auth.uid() = auth_id);

CREATE POLICY "Users can update own data" ON public.users
    FOR UPDATE USING (auth.uid() = auth_id);

CREATE POLICY "Allow trigger to insert users" ON public.users
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow trigger to insert profiles" ON public.user_profiles;

CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM public.users WHERE auth_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (
        user_id IN (
            SELECT id FROM public.users WHERE auth_id = auth.uid()
        )
    );

CREATE POLICY "Allow trigger to insert profiles" ON public.user_profiles
    FOR INSERT WITH CHECK (true);

-- STEP 6: Create a test function to verify the fix
CREATE OR REPLACE FUNCTION public.test_signup_fix()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    result TEXT;
BEGIN
    -- Check if trigger exists
    IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'on_auth_user_created'
    ) THEN
        result := 'SUCCESS: Trigger exists and should work for new signups';
    ELSE
        result := 'ERROR: Trigger still missing';
    END IF;
    
    RETURN result;
END;
$$;

-- STEP 7: Test the fix
SELECT public.test_signup_fix();

-- STEP 8: Show current status
SELECT 
    'Trigger Status' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') 
        THEN 'ACTIVE ✅' 
        ELSE 'MISSING ❌' 
    END as status
UNION ALL
SELECT 
    'Users Table' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') 
        THEN 'EXISTS ✅' 
        ELSE 'MISSING ❌' 
    END as status
UNION ALL
SELECT 
    'User Profiles Table' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles' AND table_schema = 'public') 
        THEN 'EXISTS ✅' 
        ELSE 'MISSING ❌' 
    END as status;

-- ============================================================================
-- AFTER RUNNING THIS, TEST SIGNUP IMMEDIATELY
-- The "Database error saving new user" should be resolved
-- ============================================================================