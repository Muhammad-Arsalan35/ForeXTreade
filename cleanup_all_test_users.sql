-- Cleanup script to remove ALL test users from all tables
-- This will clean up all dummy/test users you created
-- Run this in Supabase SQL Editor

-- 1. First, let's see what we have
SELECT 'Current users count:' as info;
SELECT COUNT(*) as total_users FROM public.users;

SELECT 'Current user profiles count:' as info;
SELECT COUNT(*) as total_profiles FROM public.user_profiles;

SELECT 'Current auth users count:' as info;
SELECT COUNT(*) as total_auth_users FROM auth.users;

-- 2. Delete from user_profiles first (due to foreign key constraints)
DELETE FROM public.user_profiles;

-- 3. Delete from users table
DELETE FROM public.users;

-- 4. Delete from task_completions if it exists
DELETE FROM public.task_completions WHERE user_id IS NOT NULL;

-- 5. Delete from financial_transactions if it exists
DELETE FROM public.financial_transactions WHERE user_id IS NOT NULL;

-- 6. Delete from user_wallets if it exists
DELETE FROM public.user_wallets WHERE user_id IS NOT NULL;

-- 7. Delete from referrals if it exists
DELETE FROM public.referrals WHERE referrer_id IS NOT NULL OR referred_id IS NOT NULL;

-- 8. Delete from invites if it exists
DELETE FROM public.invites WHERE inviter_id IS NOT NULL OR invitee_id IS NOT NULL;

-- 9. Delete auth users (this will cascade to related auth tables)
-- Note: This requires admin privileges, might need to be done separately
DELETE FROM auth.users;

-- 10. Reset sequences if needed
SELECT setval('users_id_seq', 1, false);
SELECT setval('user_profiles_id_seq', 1, false);

-- 11. Verify cleanup
SELECT 'After cleanup - Users count:' as info;
SELECT COUNT(*) as total_users FROM public.users;

SELECT 'After cleanup - User profiles count:' as info;
SELECT COUNT(*) as total_profiles FROM public.user_profiles;

SELECT 'After cleanup - Auth users count:' as info;
SELECT COUNT(*) as total_auth_users FROM auth.users;

SELECT '✅ All test users have been removed!' as result;