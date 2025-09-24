-- Check current trigger function definition
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND p.proname = 'create_user_profile_from_auth';

-- Check if trigger exists
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Check recent auth users and corresponding users table records
SELECT 
    au.id as auth_id,
    au.email,
    au.created_at as auth_created,
    u.id as user_id,
    u.auth_user_id,
    u.username,
    u.vip_level,
    u.created_at as user_created
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.auth_user_id
ORDER BY au.created_at DESC
LIMIT 10;