-- Fix RLS policies for users table to allow signup
-- Run this in Supabase SQL Editor

-- ============================================================================
-- 1. DROP ALL EXISTING POLICIES ON USERS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Allow user profile creation" ON users;
DROP POLICY IF EXISTS "Users can view other users for referrals" ON users;

-- ============================================================================
-- 2. CREATE NEW RLS POLICIES FOR USERS TABLE
-- ============================================================================

-- Policy: Users can read their own profile
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = auth_user_id);

-- Policy: Users can update their own profile  
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = auth_user_id);

-- Policy: Allow anyone to insert during signup (this is the key fix)
CREATE POLICY "Allow user profile creation" ON users
    FOR INSERT WITH CHECK (true);

-- Policy: Allow authenticated users to read other users (for referrals)
CREATE POLICY "Users can view other users for referrals" ON users
    FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================================
-- 3. VERIFY RLS IS ENABLED
-- ============================================================================

-- Ensure RLS is enabled on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. TEST QUERY (Optional - for verification)
-- ============================================================================

-- You can test this query to verify policies work:
-- SELECT * FROM users WHERE auth_user_id = auth.uid();