-- Fix vip_level_enum to include 'intern' as a valid value
-- Run this in Supabase SQL Editor AFTER cleaning up test users

-- 1. First, let's see the current enum values
SELECT 'Current vip_level_enum values:' as info;
SELECT enumlabel as vip_levels 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'vip_level_enum');

-- 2. Add 'intern' to the enum if it doesn't exist
DO $$
BEGIN
    -- Check if 'intern' already exists in the enum
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'vip_level_enum')
        AND enumlabel = 'intern'
    ) THEN
        -- Add 'intern' to the enum
        ALTER TYPE vip_level_enum ADD VALUE 'intern';
        RAISE NOTICE 'Added "intern" to vip_level_enum';
    ELSE
        RAISE NOTICE '"intern" already exists in vip_level_enum';
    END IF;
END $$;

-- 3. Verify the enum now includes 'intern'
SELECT 'Updated vip_level_enum values:' as info;
SELECT enumlabel as vip_levels 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'vip_level_enum')
ORDER BY enumsortorder;

-- 4. Now recreate the trigger function with proper enum value
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
        'intern'::vip_level_enum
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

-- 5. Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.create_user_profile_from_auth();

SELECT '✅ vip_level_enum fixed and trigger recreated with proper enum casting!' as result;