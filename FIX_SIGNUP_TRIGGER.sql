-- Fix the signup trigger function
-- This script will recreate the trigger function with proper error handling

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS create_user_profile_trigger ON auth.users;
DROP FUNCTION IF EXISTS create_user_profile_from_auth();

-- Create the fixed trigger function
CREATE OR REPLACE FUNCTION create_user_profile_from_auth()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert new user profile with all required fields
  INSERT INTO public.user_profiles (
    user_id,
    membership_level,
    vip_level,
    trial_tasks_completed,
    total_earnings,
    income_wallet_balance,
    personal_wallet_balance,
    daily_earnings_today,
    videos_watched_today,
    intern_trial_start_date,
    intern_trial_end_date,
    intern_trial_expired,
    last_video_reset_date,
    last_earning_reset_date
  ) VALUES (
    NEW.id,
    'trial'::membership_level,
    0,
    0,
    0.0,
    0.0,
    0.0,
    0.0,
    0,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '3 days',
    false,
    CURRENT_DATE,
    CURRENT_DATE
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Failed to create user profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER create_user_profile_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile_from_auth();

-- Verify the trigger was created
SELECT 
  tgname as trigger_name,
  tgenabled as enabled,
  tgtype as trigger_type
FROM pg_trigger 
WHERE tgname = 'create_user_profile_trigger';

-- Test the function manually (this will fail but show us the error)
-- We'll comment this out since it would fail
-- SELECT create_user_profile_from_auth();

-- Check if the function exists
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'create_user_profile_from_auth';

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.user_profiles TO anon, authenticated;

-- Ensure RLS is enabled and policies exist
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create or replace RLS policies for user_profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;

CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Final verification
SELECT 'Trigger setup complete' as status;