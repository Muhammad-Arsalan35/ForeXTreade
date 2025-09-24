-- Check if trigger exists
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing,
    action_condition
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created'
ORDER BY trigger_name;

-- Check if function exists
SELECT 
    p.proname as function_name,
    n.nspname as schema_name,
    p.prosrc as function_body
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND p.proname = 'create_user_profile_from_auth';

-- Check recent auth users and their corresponding records
SELECT 
    'Recent Auth Users and Corresponding Records' as info;

-- Show recent auth users (if accessible)
SELECT 
    id as auth_id,
    email,
    created_at
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- Show recent users in public.users
SELECT 
    id as user_id,
    auth_user_id,
    username,
    vip_level,
    created_at
FROM public.users 
ORDER BY created_at DESC 
LIMIT 5;