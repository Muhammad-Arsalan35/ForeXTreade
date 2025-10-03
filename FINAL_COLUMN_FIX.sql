-- ============================================================================
-- FINAL COLUMN FIX FOR EXISTING USER_PROFILES TABLE
-- ============================================================================
-- This script adds missing columns to the existing user_profiles table
-- and sets up the working trigger function

-- 1. Add missing columns to existing user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS is_trial_active BOOLEAN DEFAULT true;

ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS trial_start_date DATE DEFAULT CURRENT_DATE;

ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS trial_end_date DATE DEFAULT (CURRENT_DATE + INTERVAL '3 days');

ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS videos_watched_today INTEGER DEFAULT 0;

ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS last_video_reset_date DATE DEFAULT CURRENT_DATE;

ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS total_earnings NUMERIC(12,2) DEFAULT 0;

ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS income_wallet_balance NUMERIC(12,2) DEFAULT 0;

ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS personal_wallet_balance NUMERIC(12,2) DEFAULT 0;

-- 2. Update existing profiles with default values
UPDATE public.user_profiles 
SET 
    is_trial_active = COALESCE(is_trial_active, true),
    trial_start_date = COALESCE(trial_start_date, CURRENT_DATE),
    trial_end_date = COALESCE(trial_end_date, CURRENT_DATE + INTERVAL '3 days'),
    videos_watched_today = COALESCE(videos_watched_today, 0),
    last_video_reset_date = COALESCE(last_video_reset_date, CURRENT_DATE),
    total_earnings = COALESCE(total_earnings, 0),
    income_wallet_balance = COALESCE(income_wallet_balance, 0),
    personal_wallet_balance = COALESCE(personal_wallet_balance, 0);

-- 3. Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.create_user_profile_from_auth();

-- 4. Create the working trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_user_id UUID;
    unique_username TEXT;
    username_counter INTEGER := 0;
    base_username TEXT;
BEGIN
    -- Generate base username from email or use fallback
    IF NEW.email IS NOT NULL THEN
        base_username := split_part(NEW.email, '@', 1);
        base_username := regexp_replace(base_username, '[^a-zA-Z0-9]', '', 'g');
        base_username := lower(base_username);
    ELSE
        base_username := 'user_' || substr(NEW.id::text, 1, 8);
    END IF;
    
    -- Ensure username is unique
    unique_username := base_username;
    WHILE EXISTS (SELECT 1 FROM public.users WHERE username = unique_username) LOOP
        username_counter := username_counter + 1;
        unique_username := base_username || '_' || username_counter;
    END LOOP;
    
    -- Insert into public.users table
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
    
    -- Insert into public.user_profiles table
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
        0,
        0,
        0
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT INSERT ON public.users TO authenticated;
GRANT INSERT ON public.user_profiles TO authenticated;
GRANT SELECT ON public.user_profiles TO authenticated;
GRANT UPDATE ON public.user_profiles TO authenticated;

-- 7. Create/Update RLS policies
DROP POLICY IF EXISTS "Allow profile creation during signup" ON public.user_profiles;
CREATE POLICY "Allow profile creation during signup" ON public.user_profiles
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow user creation during signup" ON public.users;
CREATE POLICY "Allow user creation during signup" ON public.users
    FOR INSERT WITH CHECK (true);

-- 8. Create user profiles for users who don't have them
DO $$
DECLARE
    user_record RECORD;
    unique_username TEXT;
    username_counter INTEGER;
    base_username TEXT;
BEGIN
    FOR user_record IN 
        SELECT u.id, u.auth_user_id, u.full_name, u.username, u.phone_number
        FROM public.users u
        LEFT JOIN public.user_profiles up ON u.id = up.user_id
        WHERE up.id IS NULL
    LOOP
        -- Use existing username or generate new one
        unique_username := user_record.username;
        IF unique_username IS NULL OR unique_username = '' THEN
            base_username := 'user_' || substr(user_record.auth_user_id::text, 1, 8);
            unique_username := base_username;
            username_counter := 0;
            
            WHILE EXISTS (SELECT 1 FROM public.user_profiles WHERE username = unique_username) LOOP
                username_counter := username_counter + 1;
                unique_username := base_username || '_' || username_counter;
            END LOOP;
        END IF;
        
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
            user_record.id,
            COALESCE(user_record.full_name, 'User'),
            unique_username,
            COALESCE(user_record.phone_number, ''),
            'intern',
            'Intern',
            true,
            CURRENT_DATE,
            CURRENT_DATE + INTERVAL '3 days',
            0,
            CURRENT_DATE,
            0,
            0,
            0
        );
    END LOOP;
END $$;

-- 9. Verification queries
SELECT 'Column fix completed successfully!' as status;

-- Check column count
SELECT COUNT(*) as total_columns
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public';

-- Check specific columns exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public'
AND column_name IN ('is_trial_active', 'trial_start_date', 'trial_end_date', 'videos_watched_today', 'last_video_reset_date')
ORDER BY column_name;

-- Check trigger exists
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Check user profiles count
SELECT COUNT(*) as profile_count
FROM public.user_profiles;

-- Check users without profiles
SELECT COUNT(*) as users_without_profiles
FROM public.users u
LEFT JOIN public.user_profiles up ON u.id = up.user_id
WHERE up.id IS NULL;

-- ============================================================================
-- INSTRUCTIONS:
-- ============================================================================
-- 1. Copy this entire SQL script
-- 2. Go to your Supabase Dashboard > SQL Editor
-- 3. Paste and run this script
-- 4. Verify the output shows successful completion
-- 5. Test signup functionality with: node test_signup_simple.cjs
-- ============================================================================