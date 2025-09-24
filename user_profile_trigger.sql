-- ============================================================================
-- USER PROFILE TRIGGER FIX
-- ============================================================================
-- This SQL creates a trigger to automatically create user profiles when
-- new users sign up through Supabase Auth

-- 1. Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION create_user_profile_from_auth()
RETURNS TRIGGER AS $$
DECLARE
    intern_plan_id UUID;
    new_user_id UUID;
BEGIN
    -- Get the Intern membership plan ID
    SELECT id INTO intern_plan_id 
    FROM membership_plans 
    WHERE name = 'Intern' 
    LIMIT 1;
    
    -- Insert into public.users table first
    INSERT INTO public.users (
        auth_user_id,
        full_name,
        username,
        phone_number,
        referral_code,
        user_status
    ) VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
        COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
        COALESCE(NEW.raw_user_meta_data->>'phone_number', NEW.phone),
        UPPER(substr(gen_random_uuid()::text, 1, 8)),
        'active'
    ) RETURNING id INTO new_user_id;
    
    -- Create user profile with correct column names
    INSERT INTO public.user_profiles (
        user_id,
        full_name,
        username,
        phone_number,
        membership_type,
        membership_level,
        is_trial_active,
        trial_start_date,
        trial_end_date
    ) VALUES (
        new_user_id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
        COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
        COALESCE(NEW.raw_user_meta_data->>'phone_number', NEW.phone),
        'intern',
        'Intern',
        true,
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '3 days'
    );
    
    -- Create user plan entry
    IF intern_plan_id IS NOT NULL THEN
        INSERT INTO public.user_plans (
            user_id,
            plan_id,
            status,
            is_active
        ) VALUES (
            new_user_id,
            intern_plan_id,
            'active',
            true
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_user_profile_from_auth();

-- 3. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON membership_plans TO authenticated;
GRANT INSERT ON user_profiles TO authenticated;
GRANT INSERT ON users TO authenticated;
GRANT INSERT ON user_plans TO authenticated;

-- 4. Enable RLS policies if needed
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_plans ENABLE ROW LEVEL SECURITY;

-- Create policy for profile creation during signup
DROP POLICY IF EXISTS "Allow profile creation during signup" ON user_profiles;
CREATE POLICY "Allow profile creation during signup" ON user_profiles
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow user_plan creation during signup" ON user_plans;
CREATE POLICY "Allow user_plan creation during signup" ON user_plans
    FOR INSERT WITH CHECK (true);

-- ============================================================================
-- SETUP COMPLETE!
-- ============================================================================
