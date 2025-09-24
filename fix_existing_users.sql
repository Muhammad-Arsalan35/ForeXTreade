-- Fix existing users to have intern level instead of VIP1
-- This script should be run in Supabase SQL Editor

-- 1. Update existing users to intern level
UPDATE public.users 
SET vip_level = 'intern' 
WHERE vip_level = 'VIP1' OR vip_level IS NULL;

-- 2. Update existing user profiles to intern membership
UPDATE public.user_profiles 
SET membership_type = 'intern', membership_level = 'Intern' 
WHERE membership_type != 'intern' OR membership_type IS NULL;

-- 3. Drop and recreate the trigger function with the correct vip_level
DROP FUNCTION IF EXISTS public.create_user_profile_from_auth() CASCADE;

CREATE OR REPLACE FUNCTION public.create_user_profile_from_auth()
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
    
    -- Insert into public.user_profiles table with intern membership
    INSERT INTO public.user_profiles (
        user_id,
        membership_type,
        membership_level,
        created_at,
        updated_at
    ) VALUES (
        new_user_id,
        'intern',
        'Intern',
        NOW(),
        NOW()
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.create_user_profile_from_auth();

-- 5. Verify the changes
SELECT 'Users with VIP levels:' as info;
SELECT vip_level, COUNT(*) as count FROM public.users GROUP BY vip_level;

SELECT 'User profiles with membership types:' as info;
SELECT membership_type, membership_level, COUNT(*) as count FROM public.user_profiles GROUP BY membership_type, membership_level;