-- ============================================================================
-- SIMPLE USER PROFILE TRIGGER (CORRECTED - NO USER_PLANS TABLE)
-- ============================================================================

-- 1. Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION create_user_profile_from_auth()
RETURNS TRIGGER AS $$
DECLARE
    new_user_id UUID;
BEGIN
    -- Insert into public.users table first with 'intern' as default vip_level
    INSERT INTO public.users (
        auth_user_id,
        full_name,
        username,
        phone_number,
        referral_code,
        user_status,
        vip_level
    ) VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
        COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
        COALESCE(NEW.raw_user_meta_data->>'phone_number', NEW.phone),
        UPPER(substr(gen_random_uuid()::text, 1, 8)),
        'active',
        'intern'
    ) RETURNING id INTO new_user_id;
    
    -- Create user profile with basic columns only
    INSERT INTO public.user_profiles (
        user_id,
        full_name,
        username,
        phone_number,
        membership_type,
        membership_level
    ) VALUES (
        new_user_id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
        COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
        COALESCE(NEW.raw_user_meta_data->>'phone_number', NEW.phone),
        'intern',
        'Intern'
    );
    
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

-- 4. Enable RLS policies if needed
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for profile creation during signup
DROP POLICY IF EXISTS "Allow profile creation during signup" ON user_profiles;
CREATE POLICY "Allow profile creation during signup" ON user_profiles
    FOR INSERT WITH CHECK (true);

-- ============================================================================
-- SETUP COMPLETE!
-- ============================================================================
-- This trigger will automatically create:
-- 1. A record in the 'users' table
-- 2. A record in the 'user_profiles' table with 'intern' membership
-- 
-- Note: The user_plans table does not exist in this database schema,
-- so membership is handled through the membership_type and membership_level
-- columns in the user_profiles table.
-- ============================================================================
