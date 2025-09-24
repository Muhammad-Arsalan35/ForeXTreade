-- ============================================================================
-- FINAL CORRECTED TRIGGER - MATCHES ACTUAL TABLE STRUCTURE
-- ============================================================================

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS create_user_profile_from_auth();

-- Create corrected function that matches the actual table structure
CREATE OR REPLACE FUNCTION create_user_profile_from_auth()
RETURNS TRIGGER AS $$
DECLARE
    new_user_id UUID;
BEGIN
    -- Insert into users table with columns that actually exist
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
        'VIP1'
    ) RETURNING id INTO new_user_id;
    
    -- Insert into user_profiles table
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
        'VIP1'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_user_profile_from_auth();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT INSERT ON users TO authenticated;
GRANT INSERT ON user_profiles TO authenticated;

-- Enable RLS policies for signup
DROP POLICY IF EXISTS "Allow profile creation during signup" ON user_profiles;
CREATE POLICY "Allow profile creation during signup" ON user_profiles
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow user creation during signup" ON users;
CREATE POLICY "Allow user creation during signup" ON users
    FOR INSERT WITH CHECK (true);

-- ============================================================================
-- TRIGGER SETUP COMPLETE!
-- ============================================================================
-- This trigger will now correctly create:
-- 1. A record in the 'users' table with proper column names
-- 2. A record in the 'user_profiles' table with 'intern' membership
-- 
-- The trigger will be activated when a new user signs up through Supabase Auth.
-- No manual testing is included to avoid foreign key constraint issues.
-- 
-- To test: Use the actual signup process in your application.