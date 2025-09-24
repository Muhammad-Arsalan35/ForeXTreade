-- Fix User Profile Creation Trigger
-- This script creates the missing trigger to automatically create user_profiles 
-- when new users sign up through Supabase Auth

-- ============================================================================
-- 1. CREATE FUNCTION TO CREATE USER PROFILE FROM AUTH.USERS
-- ============================================================================

CREATE OR REPLACE FUNCTION create_user_profile_from_auth()
RETURNS TRIGGER AS $$
DECLARE
    intern_plan_id UUID;
BEGIN
    -- Get the Intern membership plan ID
    SELECT id INTO intern_plan_id 
    FROM membership_plans 
    WHERE name = 'Intern' AND is_active = true 
    LIMIT 1;

    -- If no Intern plan found, use the first available plan
    IF intern_plan_id IS NULL THEN
        SELECT id INTO intern_plan_id 
        FROM membership_plans 
        WHERE is_active = true 
        ORDER BY price ASC 
        LIMIT 1;
    END IF;

    -- Create user profile with intern membership
    INSERT INTO user_profiles (
        user_id,
        full_name,
        username,
        phone_number,
        membership_type,
        membership_level,
        is_trial_active,
        trial_start_date,
        trial_end_date,
        videos_watched_today,
        last_video_reset_date,
        total_earnings,
        income_wallet_balance,
        personal_wallet_balance,
        plan_id,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', 'User'),
        COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
        COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone),
        'intern',  -- Set membership type to intern
        'Intern',  -- Set membership level to Intern
        true,      -- Trial is active
        CURRENT_DATE,  -- Trial starts today
        CURRENT_DATE + INTERVAL '3 days',  -- 3-day trial
        0,         -- No videos watched yet
        CURRENT_DATE,  -- Reset date is today
        0,         -- No earnings yet
        0,         -- No income wallet balance
        0,         -- No personal wallet balance
        intern_plan_id,  -- Link to intern plan
        NOW(),
        NOW()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. CREATE TRIGGER TO AUTOMATICALLY CREATE USER PROFILES
-- ============================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_create_user_profile_from_auth ON auth.users;

-- Create new trigger
CREATE TRIGGER trigger_create_user_profile_from_auth
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_profile_from_auth();

-- ============================================================================
-- 3. GRANT NECESSARY PERMISSIONS
-- ============================================================================

-- Grant permissions for the function to work
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON membership_plans TO authenticated;
GRANT INSERT ON user_profiles TO authenticated;

-- ============================================================================
-- 4. ENABLE RLS ON USER_PROFILES IF NOT ALREADY ENABLED
-- ============================================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

-- Create policy for users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Create policy to allow profile creation during signup
DROP POLICY IF EXISTS "Allow profile creation during signup" ON user_profiles;
CREATE POLICY "Allow profile creation during signup" ON user_profiles
    FOR INSERT WITH CHECK (true);

COMMENT ON FUNCTION create_user_profile_from_auth() IS 'Automatically creates a user profile with intern membership when a new user signs up through Supabase Auth';
COMMENT ON TRIGGER trigger_create_user_profile_from_auth ON auth.users IS 'Triggers automatic user profile creation for new auth users';