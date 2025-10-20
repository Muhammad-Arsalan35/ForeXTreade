-- ==========================================================================
-- Quick verification queries after running 00, 01, and 02
-- Run this in Supabase SQL Editor
-- ==========================================================================

-- Confirm RLS policies exist
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('users', 'user_profiles')
ORDER BY tablename, policyname;

-- Show last created users/profile rows
SELECT id, auth_user_id, username, created_at
FROM public.users
ORDER BY created_at DESC NULLS LAST
LIMIT 5;

SELECT user_id, username
FROM public.user_profiles
ORDER BY user_id DESC
LIMIT 5;

-- Sanity: mapping between auth user and profile
SELECT u.auth_user_id, u.username AS user_username, p.username AS profile_username
FROM public.users u
JOIN public.user_profiles p ON p.user_id = u.id
ORDER BY u.created_at DESC NULLS LAST
LIMIT 5;