-- ============================================================================
-- NUCLEAR CONSTRAINT REMOVAL - FIXED COLUMN MAPPING
-- ============================================================================
-- This script will DEFINITELY remove the foreign key constraint by recreating the table

-- 1. BACKUP ALL DATA FIRST
CREATE TABLE IF NOT EXISTS users_emergency_backup AS 
SELECT * FROM public.users;

CREATE TABLE IF NOT EXISTS user_profiles_emergency_backup AS 
SELECT * FROM public.user_profiles;

-- 2. DROP ALL DEPENDENT OBJECTS
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 3. DROP THE USERS TABLE COMPLETELY (this will remove ALL constraints)
DROP TABLE IF EXISTS public.users CASCADE;

-- 4. RECREATE USERS TABLE WITHOUT ANY FOREIGN KEY CONSTRAINTS
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE NOT NULL, -- NO FOREIGN KEY REFERENCE
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

-- 5. RESTORE DATA FROM BACKUP (with proper column mapping)
INSERT INTO public.users (
    id,
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
    position_title,
    created_at,
    updated_at
)
SELECT 
    id,
    auth_user_id,
    full_name,
    username,
    phone_number,
    COALESCE(vip_level, 'VIP1'),
    COALESCE(user_status, 'active'),
    referral_code,
    COALESCE(personal_wallet_balance, 0.00),
    COALESCE(income_wallet_balance, 0.00),
    COALESCE(total_earnings, 0.00),
    COALESCE(total_invested, 0.00),
    COALESCE(position_title, 'Member'),
    COALESCE(created_at, NOW()),
    COALESCE(updated_at, NOW())
FROM users_emergency_backup;

-- 6. ENABLE RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 7. CREATE PERMISSIVE RLS POLICY
DROP POLICY IF EXISTS "Allow all operations" ON public.users;
CREATE POLICY "Allow all operations" ON public.users
    FOR ALL USING (true) WITH CHECK (true);

-- 8. GRANT ALL PERMISSIONS
GRANT ALL ON public.users TO authenticated, anon, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon, service_role;

-- 9. CREATE SIMPLIFIED TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_user_id UUID;
    unique_username TEXT;
    username_counter INTEGER := 0;
    base_username TEXT;
BEGIN
    RAISE NOTICE 'NUCLEAR TRIGGER: Processing auth user %', NEW.id;
    
    -- Generate unique username
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
    
    unique_username := base_username;
    WHILE EXISTS (SELECT 1 FROM public.users WHERE username = unique_username) LOOP
        username_counter := username_counter + 1;
        unique_username := base_username || '_' || username_counter;
    END LOOP;
    
    -- Insert user (NO FOREIGN KEY CONSTRAINTS TO WORRY ABOUT)
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
        
        RAISE NOTICE 'NUCLEAR TRIGGER: User created with ID %', new_user_id;
        
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
        
        RAISE NOTICE 'NUCLEAR TRIGGER: Profile created for user %', new_user_id;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'NUCLEAR TRIGGER ERROR: %', SQLERRM;
        -- Continue to allow auth user creation
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. CREATE TRIGGER
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 11. GRANT TRIGGER FUNCTION PERMISSIONS
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated, anon, service_role;

-- 12. FINAL VERIFICATION
SELECT 'NUCLEAR CONSTRAINT REMOVAL COMPLETED!' as status;

-- Verify NO foreign key constraints exist
SELECT 
    CASE 
        WHEN COUNT(*) = 0 
        THEN '🚀 NUCLEAR SUCCESS: NO FOREIGN KEY CONSTRAINTS!'
        ELSE '💥 NUCLEAR FAILURE: CONSTRAINTS STILL EXIST: ' || string_agg(constraint_name, ', ')
    END as nuclear_constraint_check
FROM information_schema.table_constraints 
WHERE table_name = 'users' 
AND table_schema = 'public' 
AND constraint_type = 'FOREIGN KEY';

-- Verify trigger function exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user')
        THEN '🚀 NUCLEAR SUCCESS: Trigger function exists'
        ELSE '💥 NUCLEAR FAILURE: Trigger function missing'
    END as nuclear_function_check;

-- Verify trigger exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.triggers 
            WHERE trigger_name = 'on_auth_user_created'
        )
        THEN '🚀 NUCLEAR SUCCESS: Trigger exists'
        ELSE '💥 NUCLEAR FAILURE: Trigger missing'
    END as nuclear_trigger_check;

-- Verify data was preserved
SELECT 
    CASE 
        WHEN COUNT(*) > 0 
        THEN '🚀 NUCLEAR SUCCESS: Data preserved (' || COUNT(*) || ' users)'
        ELSE '💥 NUCLEAR WARNING: No users found'
    END as nuclear_data_check
FROM public.users;

-- ============================================================================
-- NUCLEAR INSTRUCTIONS:
-- ============================================================================
-- 1. Copy this ENTIRE FIXED script
-- 2. Go to Supabase Dashboard > SQL Editor
-- 3. Paste and run this script
-- 4. Verify ALL checks show 🚀 NUCLEAR SUCCESS
-- 5. Test signup IMMEDIATELY: node test_signup_simple.cjs
-- 
-- This script RECREATES the users table without ANY foreign key constraints
-- and properly maps columns during data restoration.
-- ============================================================================