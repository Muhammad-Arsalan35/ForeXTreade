-- ============================================================================
-- SUPABASE DATABASE SETUP COMMANDS
-- Run these commands in your Supabase SQL Editor
-- ============================================================================

-- 1. ENABLE RLS ON USERS TABLE
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 2. DROP EXISTING POLICIES (if any)
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Allow user profile creation" ON users;
DROP POLICY IF EXISTS "Users can view other users for referrals" ON users;

-- 3. CREATE RLS POLICIES FOR USERS TABLE
-- Policy: Users can read their own profile
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = auth_user_id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = auth_user_id);

-- Policy: Allow insert during signup (temporary)
CREATE POLICY "Allow user profile creation" ON users
    FOR INSERT WITH CHECK (true);

-- Policy: Allow authenticated users to read other users (for referrals)
CREATE POLICY "Users can view other users for referrals" ON users
    FOR SELECT USING (auth.role() = 'authenticated');

-- 4. DROP EXISTING TRIGGER FUNCTION (if any)
DROP FUNCTION IF EXISTS handle_new_user();

-- 5. CREATE TRIGGER FUNCTION FOR AUTOMATIC USER PROFILE CREATION
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert into public.users table
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
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. DROP EXISTING TRIGGER (if any)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 7. CREATE TRIGGER TO CALL THE FUNCTION
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 8. GRANT NECESSARY PERMISSIONS
-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Grant permissions on users table
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT SELECT ON public.users TO anon;

-- Grant permissions on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 9. CREATE INDEXES FOR BETTER PERFORMANCE
-- Index for auth_user_id lookups
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id_lookup ON users(auth_user_id);

-- Index for phone number lookups
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number);

-- Index for username lookups
CREATE INDEX IF NOT EXISTS idx_users_username_lookup ON users(username);

-- 10. VERIFY SETUP
-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'users';

-- Check policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users';

-- Check trigger
SELECT trigger_name, event_manipulation, event_object_table, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users';
