-- Add RLS policies and trigger function for user profile management
-- This migration fixes the "Database error saving new user" issue

-- ============================================================================
-- 1. ENABLE RLS ON USERS TABLE
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. CREATE RLS POLICIES FOR USERS TABLE
-- ============================================================================

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

-- ============================================================================
-- 3. CREATE TRIGGER FUNCTION FOR AUTOMATIC USER PROFILE CREATION
-- ============================================================================

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

-- ============================================================================
-- 4. CREATE TRIGGER TO CALL THE FUNCTION
-- ============================================================================

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- 5. CREATE FUNCTION TO UPDATE USER PROFILE
-- ============================================================================

CREATE OR REPLACE FUNCTION update_user_profile(
    user_id UUID,
    full_name TEXT DEFAULT NULL,
    username TEXT DEFAULT NULL,
    phone_number TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.users
    SET 
        full_name = COALESCE(update_user_profile.full_name, full_name),
        username = COALESCE(update_user_profile.username, username),
        phone_number = COALESCE(update_user_profile.phone_number, phone_number),
        updated_at = NOW()
    WHERE auth_user_id = user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. GRANT NECESSARY PERMISSIONS
-- ============================================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Grant permissions on users table
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT SELECT ON public.users TO anon;

-- Grant permissions on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================================
-- 7. CREATE INDEXES FOR BETTER PERFORMANCE
-- ============================================================================

-- Index for auth_user_id lookups
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id_lookup ON users(auth_user_id);

-- Index for phone number lookups
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number);

-- Index for username lookups
CREATE INDEX IF NOT EXISTS idx_users_username_lookup ON users(username);

-- ============================================================================
-- 8. CREATE FUNCTION TO GET USER BY PHONE
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_by_phone(phone_input TEXT)
RETURNS TABLE (
    id UUID,
    auth_user_id UUID,
    full_name TEXT,
    username TEXT,
    phone_number TEXT,
    referral_code TEXT,
    user_status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.auth_user_id,
        u.full_name,
        u.username,
        u.phone_number,
        u.referral_code,
        u.user_status::TEXT
    FROM public.users u
    WHERE u.phone_number = phone_input
    OR u.phone_number = REPLACE(phone_input, '+92', '0')
    OR u.phone_number = REPLACE(phone_input, '0', '+92');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;