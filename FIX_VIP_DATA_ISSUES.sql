-- ============================================================================
-- FIX VIP DATA ISSUES - Run this in Supabase SQL Editor
-- ============================================================================
-- This fixes all the VIP level and data fetching issues identified
-- ============================================================================

-- 0. Create membership_level enum type if it doesn't exist
DO $$ 
BEGIN
    -- Check if the enum type exists
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'membership_level') THEN
        -- Create the enum type with all possible values
        CREATE TYPE membership_level AS ENUM (
            'trial',
            'Intern',
            'VIP1',
            'VIP2', 
            'VIP3',
            'VIP4',
            'VIP5'
        );
        RAISE NOTICE 'Created membership_level enum type';
    ELSE
        RAISE NOTICE 'membership_level enum type already exists';
    END IF;
END $$;

-- 1. Add missing trial_tasks_completed column to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS trial_tasks_completed INTEGER DEFAULT 0;

-- 2. Create the missing vip_levels table
CREATE TABLE IF NOT EXISTS public.vip_levels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    level INTEGER NOT NULL UNIQUE,
    name TEXT NOT NULL,
    task_reward DECIMAL(10,2) NOT NULL,
    daily_tasks INTEGER NOT NULL,
    monthly_fee DECIMAL(10,2) DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Insert VIP level data
INSERT INTO public.vip_levels (level, name, task_reward, daily_tasks, monthly_fee, description) VALUES
(0, 'Trial', 0, 3, 0, 'Trial membership with limited tasks'),
(1, 'VIP1', 30, 10, 5000, 'VIP1 - 30 PKR per task, 10 daily tasks'),
(2, 'VIP2', 50, 15, 16000, 'VIP2 - 50 PKR per task, 15 daily tasks'),
(3, 'VIP3', 80, 20, 36000, 'VIP3 - 80 PKR per task, 20 daily tasks'),
(4, 'VIP4', 120, 25, 78000, 'VIP4 - 120 PKR per task, 25 daily tasks'),
(5, 'VIP5', 180, 30, 160000, 'VIP5 - 180 PKR per task, 30 daily tasks'),
(6, 'VIP6', 250, 35, 260000, 'VIP6 - 250 PKR per task, 35 daily tasks'),
(7, 'VIP7', 350, 40, 500000, 'VIP7 - 350 PKR per task, 40 daily tasks'),
(8, 'VIP8', 500, 45, 800000, 'VIP8 - 500 PKR per task, 45 daily tasks'),
(9, 'VIP9', 700, 50, 1200000, 'VIP9 - 700 PKR per task, 50 daily tasks'),
(10, 'VIP10', 1000, 60, 2400000, 'VIP10 - 1000 PKR per task, 60 daily tasks')
ON CONFLICT (level) DO UPDATE SET
    name = EXCLUDED.name,
    task_reward = EXCLUDED.task_reward,
    daily_tasks = EXCLUDED.daily_tasks,
    monthly_fee = EXCLUDED.monthly_fee,
    description = EXCLUDED.description,
    updated_at = NOW();

-- 4. Fix membership plans VIP level assignments
UPDATE public.membership_plans SET vip_level = 0 WHERE name = 'Intern';
UPDATE public.membership_plans SET vip_level = 1 WHERE name = 'VIP1';
UPDATE public.membership_plans SET vip_level = 2 WHERE name = 'VIP2';
UPDATE public.membership_plans SET vip_level = 3 WHERE name = 'VIP3';
UPDATE public.membership_plans SET vip_level = 4 WHERE name = 'VIP4';
UPDATE public.membership_plans SET vip_level = 5 WHERE name = 'VIP5';
UPDATE public.membership_plans SET vip_level = 6 WHERE name = 'VIP6';
UPDATE public.membership_plans SET vip_level = 7 WHERE name = 'VIP7';
UPDATE public.membership_plans SET vip_level = 8 WHERE name = 'VIP8';
UPDATE public.membership_plans SET vip_level = 9 WHERE name = 'VIP9';
UPDATE public.membership_plans SET vip_level = 10 WHERE name = 'VIP10';

-- 5. Create missing user profiles for users without profiles
INSERT INTO public.user_profiles (
    id, 
    user_id, 
    full_name, 
    username,
    membership_level,
    vip_level,
    trial_tasks_completed,
    created_at, 
    updated_at
)
SELECT 
    gen_random_uuid(),
    u.id,
    u.full_name,
    u.username,
    'trial'::membership_level,
    0,
    0,
    u.created_at,
    NOW()
FROM public.users u
LEFT JOIN public.user_profiles up ON u.id = up.user_id
WHERE up.user_id IS NULL;

-- 6. Update the trigger function to include trial_tasks_completed
CREATE OR REPLACE FUNCTION public.create_user_profile_from_auth()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    new_user_id UUID;
    simple_username TEXT;
BEGIN
    RAISE NOTICE 'TRIGGER START: Auth User ID = %', NEW.id;
    
    -- Generate simple username
    simple_username := 'user_' || extract(epoch from now())::bigint;
    RAISE NOTICE 'Generated username: %', simple_username;
    
    -- Try minimal insert into users table
    BEGIN
        RAISE NOTICE 'Attempting insert into users table...';
        
        INSERT INTO public.users (
            id, 
            auth_user_id, 
            full_name, 
            username,
            user_status,
            total_invested,
            created_at, 
            updated_at
        ) VALUES (
            gen_random_uuid(), 
            NEW.id, 
            'User', 
            simple_username,
            'active',
            0,
            NOW(), 
            NOW()
        ) RETURNING id INTO new_user_id;
        
        RAISE NOTICE 'SUCCESS: Inserted user with ID = %', new_user_id;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'ERROR inserting into users: % - %', SQLERRM, SQLSTATE;
        RAISE;
    END;
    
    -- Try minimal insert into user_profiles table with trial_tasks_completed
    BEGIN
        RAISE NOTICE 'Attempting insert into user_profiles table...';
        
        INSERT INTO public.user_profiles (
            id, 
            user_id, 
            full_name, 
            username,
            membership_level,
            vip_level,
            trial_tasks_completed,
            created_at, 
            updated_at
        ) VALUES (
            gen_random_uuid(), 
            new_user_id, 
            'User', 
            simple_username,
            'trial',
            0,
            0,
            NOW(), 
            NOW()
        );
        
        RAISE NOTICE 'SUCCESS: Inserted user_profile with trial_tasks_completed';
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'ERROR inserting into user_profiles: % - %', SQLERRM, SQLSTATE;
        RAISE;
    END;

    RAISE NOTICE 'TRIGGER COMPLETED SUCCESSFULLY for user %', NEW.id;
    RETURN NEW;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TRIGGER FAILED: % - %', SQLERRM, SQLSTATE;
    RAISE;
END;
$$;

-- 7. Grant permissions on new table
GRANT ALL ON public.vip_levels TO postgres, anon, authenticated, service_role;

-- 8. Create RLS policies for vip_levels table
ALTER TABLE public.vip_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "VIP levels are viewable by everyone" ON public.vip_levels
    FOR SELECT USING (true);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check if trial_tasks_completed column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND column_name = 'trial_tasks_completed';

-- Check VIP levels table
SELECT COUNT(*) as vip_levels_count FROM public.vip_levels;

-- Check membership plans VIP assignments
SELECT name, vip_level FROM public.membership_plans ORDER BY vip_level;

-- Check users without profiles (should be 0)
SELECT COUNT(*) as users_without_profiles
FROM public.users u
LEFT JOIN public.user_profiles up ON u.id = up.user_id
WHERE up.user_id IS NULL;

-- ============================================================================
-- INSTRUCTIONS:
-- 1. Run this entire script in Supabase SQL Editor
-- 2. Check the verification queries output
-- 3. Test signup and VIP level data fetching
-- ============================================================================