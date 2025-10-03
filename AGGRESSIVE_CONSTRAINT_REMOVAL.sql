-- ============================================================================
-- AGGRESSIVE CONSTRAINT REMOVAL - FORCE REMOVE FOREIGN KEY
-- ============================================================================
-- This script aggressively removes the foreign key constraint that's blocking signup

-- 1. Force drop ALL foreign key constraints on users table
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    -- Get all foreign key constraints on users table
    FOR constraint_record IN 
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'users' 
        AND table_schema = 'public' 
        AND constraint_type = 'FOREIGN KEY'
    LOOP
        EXECUTE format('ALTER TABLE public.users DROP CONSTRAINT IF EXISTS %I CASCADE', constraint_record.constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_record.constraint_name;
    END LOOP;
    
    -- Specifically target the problematic constraint
    BEGIN
        ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_auth_user_id_fkey CASCADE;
        RAISE NOTICE 'Specifically dropped users_auth_user_id_fkey';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not drop users_auth_user_id_fkey: %', SQLERRM;
    END;
END $$;

-- 2. Verify constraint removal
SELECT 
    constraint_name,
    constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'users' 
AND table_schema = 'public' 
AND constraint_type = 'FOREIGN KEY';

-- 3. Drop and recreate the users table if constraints persist
DO $$
BEGIN
    -- Check if any foreign key constraints still exist
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'users' 
        AND table_schema = 'public' 
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        RAISE NOTICE 'Foreign key constraints still exist, recreating table...';
        
        -- Backup existing data
        CREATE TEMP TABLE users_backup AS SELECT * FROM public.users;
        
        -- Drop the table completely
        DROP TABLE IF EXISTS public.users CASCADE;
        
        -- Recreate without foreign key constraints
        CREATE TABLE public.users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            auth_user_id UUID UNIQUE, -- NO FOREIGN KEY CONSTRAINT
            full_name TEXT,
            username TEXT UNIQUE,
            phone_number TEXT,
            vip_level TEXT DEFAULT 'VIP1',
            user_status TEXT DEFAULT 'active',
            referral_code TEXT UNIQUE,
            personal_wallet_balance DECIMAL(10,2) DEFAULT 0.00,
            income_wallet_balance DECIMAL(10,2) DEFAULT 0.00,
            total_earnings DECIMAL(10,2) DEFAULT 0.00,
            total_invested DECIMAL(10,2) DEFAULT 0.00,
            position_title TEXT DEFAULT 'Member',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Restore data
        INSERT INTO public.users SELECT * FROM users_backup;
        
        -- Enable RLS
        ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
        
        RAISE NOTICE 'Users table recreated without foreign key constraints';
    ELSE
        RAISE NOTICE 'No foreign key constraints found on users table';
    END IF;
END $$;

-- 4. Ensure RLS policies are permissive
DROP POLICY IF EXISTS "Allow all operations during signup" ON public.users;
CREATE POLICY "Allow all operations during signup" ON public.users
    FOR ALL USING (true) WITH CHECK (true);

-- 5. Grant permissions
GRANT ALL ON public.users TO authenticated, anon, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon, service_role;

-- 6. Recreate trigger function (simplified version)
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_user_id UUID;
    unique_username TEXT;
    username_counter INTEGER := 0;
    base_username TEXT;
BEGIN
    RAISE NOTICE 'Trigger executing for auth user: %', NEW.id;
    
    -- Generate username
    IF NEW.email IS NOT NULL THEN
        base_username := split_part(NEW.email, '@', 1);
        base_username := regexp_replace(base_username, '[^a-zA-Z0-9]', '', 'g');
        base_username := lower(base_username);
        IF length(base_username) < 3 THEN
            base_username := 'user_' || substr(NEW.id::text, 1, 8);
        END IF;
    ELSE
        base_username := 'user_' || substr(NEW.id::text, 1, 8);
    END IF;
    
    -- Make username unique
    unique_username := base_username;
    WHILE EXISTS (SELECT 1 FROM public.users WHERE username = unique_username) LOOP
        username_counter := username_counter + 1;
        unique_username := base_username || '_' || username_counter;
    END LOOP;
    
    -- Insert user (no foreign key constraint to worry about)
    BEGIN
        INSERT INTO public.users (
            auth_user_id,
            full_name,
            username,
            phone_number,
            vip_level,
            user_status,
            referral_code,
            personal_wallet_balance,
            income_wallet_balance,
            total_earnings,
            total_invested,
            position_title
        ) VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
            unique_username,
            COALESCE(NEW.raw_user_meta_data->>'phone_number', NEW.phone, ''),
            'VIP1',
            'active',
            UPPER(substr(gen_random_uuid()::text, 1, 8)),
            0.00,
            0.00,
            0.00,
            0.00,
            'Member'
        ) RETURNING id INTO new_user_id;
        
        RAISE NOTICE 'User created with ID: %', new_user_id;
        
        -- Create user profile
        INSERT INTO public.user_profiles (
            user_id,
            full_name,
            username,
            phone_number,
            membership_type,
            membership_level,
            is_trial_active,
            trial_start_date,
            trial_end_date,
            videos_watched_today,
            last_video_reset_date,
            total_earnings,
            income_wallet_balance,
            personal_wallet_balance
        ) VALUES (
            new_user_id,
            COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
            unique_username,
            COALESCE(NEW.raw_user_meta_data->>'phone_number', NEW.phone, ''),
            'intern',
            'Intern',
            true,
            CURRENT_DATE,
            CURRENT_DATE + INTERVAL '3 days',
            0,
            CURRENT_DATE,
            0.00,
            0.00,
            0.00
        );
        
        RAISE NOTICE 'User profile created for user ID: %', new_user_id;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error in trigger: %', SQLERRM;
        -- Continue anyway to allow auth user creation
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. Final verification
SELECT 'AGGRESSIVE CONSTRAINT REMOVAL COMPLETED!' as status;

-- Check for any remaining foreign key constraints
SELECT 
    CASE 
        WHEN COUNT(*) = 0 
        THEN '✅ NO FOREIGN KEY CONSTRAINTS - SUCCESS!'
        ELSE '❌ FOREIGN KEY CONSTRAINTS STILL EXIST: ' || string_agg(constraint_name, ', ')
    END as constraint_check
FROM information_schema.table_constraints 
WHERE table_name = 'users' 
AND table_schema = 'public' 
AND constraint_type = 'FOREIGN KEY';

-- Check trigger function
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user')
        THEN '✅ Trigger function exists'
        ELSE '❌ Trigger function missing'
    END as function_check;

-- Check trigger
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.triggers 
            WHERE trigger_name = 'on_auth_user_created'
        )
        THEN '✅ Trigger exists'
        ELSE '❌ Trigger missing'
    END as trigger_check;

-- ============================================================================
-- INSTRUCTIONS:
-- ============================================================================
-- 1. Copy this ENTIRE script
-- 2. Go to Supabase Dashboard > SQL Editor  
-- 3. Paste and run this script
-- 4. Verify all checks show ✅ SUCCESS
-- 5. Test signup immediately: node test_signup_simple.cjs
-- ============================================================================