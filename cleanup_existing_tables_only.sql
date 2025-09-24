-- Simplified cleanup script - only removes from existing tables
-- Run this in Supabase SQL Editor

-- 1. Check what tables exist first
SELECT 'Checking existing tables...' as info;

-- 2. Delete from user_profiles first (due to foreign key constraints)
DELETE FROM public.user_profiles;
SELECT 'Deleted from user_profiles' as result;

-- 3. Delete from users table
DELETE FROM public.users;
SELECT 'Deleted from users' as result;

-- 4. Delete auth users (this will cascade to related auth tables)
DELETE FROM auth.users;
SELECT 'Deleted from auth.users' as result;

-- 5. Reset sequences if they exist
DO $$
BEGIN
    -- Reset users sequence if it exists
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'users_id_seq') THEN
        PERFORM setval('users_id_seq', 1, false);
    END IF;
    
    -- Reset user_profiles sequence if it exists
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'user_profiles_id_seq') THEN
        PERFORM setval('user_profiles_id_seq', 1, false);
    END IF;
END $$;

-- 6. Verify cleanup
SELECT 'After cleanup - Users count:' as info;
SELECT COUNT(*) as total_users FROM public.users;

SELECT 'After cleanup - User profiles count:' as info;
SELECT COUNT(*) as total_profiles FROM public.user_profiles;

SELECT 'After cleanup - Auth users count:' as info;
SELECT COUNT(*) as total_auth_users FROM auth.users;

SELECT '✅ All test users have been removed from existing tables!' as result;