-- ============================================================================
-- COMPLETE DATABASE SETUP FOR USER_PROFILES TABLE AND SIGNUP TRIGGER
-- ============================================================================
-- This SQL file creates the user_profiles table and sets up the working trigger

-- 1. Create user_profiles table with all required columns
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  full_name VARCHAR(100),
  username VARCHAR(50),
  phone_number VARCHAR(30),
  
  -- Membership fields
  membership_type VARCHAR(20) DEFAULT 'intern' CHECK (membership_type IN ('free', 'intern', 'vip')),
  membership_level VARCHAR(10) DEFAULT 'Intern',
  
  -- Trial status
  is_trial_active BOOLEAN DEFAULT true,
  trial_start_date DATE DEFAULT CURRENT_DATE,
  trial_end_date DATE DEFAULT (CURRENT_DATE + INTERVAL '3 days'),
  
  -- Video tracking
  videos_watched_today INTEGER DEFAULT 0,
  last_video_reset_date DATE DEFAULT CURRENT_DATE,
  
  -- Financial tracking
  total_earnings NUMERIC(12,2) DEFAULT 0,
  income_wallet_balance NUMERIC(12,2) DEFAULT 0,
  personal_wallet_balance NUMERIC(12,2) DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_membership_type ON public.user_profiles(membership_type);
CREATE INDEX IF NOT EXISTS idx_user_profiles_trial_active ON public.user_profiles(is_trial_active);

-- 3. Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.create_user_profile_from_auth();

-- 5. Create the working trigger function
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

-- 6. Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT INSERT ON public.users TO authenticated;
GRANT INSERT ON public.user_profiles TO authenticated;
GRANT SELECT ON public.user_profiles TO authenticated;
GRANT UPDATE ON public.user_profiles TO authenticated;

-- 8. Create RLS policies for user_profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
CREATE POLICY "Users can view their own profile" 
  ON public.user_profiles FOR SELECT 
  USING (auth.uid() IN (
    SELECT auth_user_id FROM public.users WHERE id = user_id
  ));

DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
CREATE POLICY "Users can update their own profile" 
  ON public.user_profiles FOR UPDATE 
  USING (auth.uid() IN (
    SELECT auth_user_id FROM public.users WHERE id = user_id
  ));

DROP POLICY IF EXISTS "Allow profile creation during signup" ON public.user_profiles;
CREATE POLICY "Allow profile creation during signup" ON public.user_profiles
    FOR INSERT WITH CHECK (true);

-- 9. Create RLS policies for users table (if needed)
DROP POLICY IF EXISTS "Allow user creation during signup" ON public.users;
CREATE POLICY "Allow user creation during signup" ON public.users
    FOR INSERT WITH CHECK (true);

-- 10. Create user profiles for existing users who don't have them
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

-- 11. Verification queries
SELECT 'Database setup completed successfully!' as status;

-- Check if user_profiles table was created
SELECT 'user_profiles_table_check' as check_name,
       COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public';

-- Check specific columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public'
AND column_name IN ('is_trial_active', 'trial_start_date', 'trial_end_date', 'videos_watched_today', 'last_video_reset_date')
ORDER BY column_name;

-- Check if trigger function exists
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user'
AND routine_schema = 'public';

-- Check if trigger exists
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Check user profiles count
SELECT 'user_profiles_count' as check_name,
       COUNT(*) as profile_count
FROM public.user_profiles;

-- Check users without profiles
SELECT 'users_without_profiles' as check_name,
       COUNT(*) as count
FROM public.users u
LEFT JOIN public.user_profiles up ON u.id = up.user_id
WHERE up.id IS NULL;

-- ============================================================================
-- INSTRUCTIONS FOR MANUAL APPLICATION:
-- ============================================================================
-- 1. Copy this entire SQL script
-- 2. Go to your Supabase Dashboard > SQL Editor
-- 3. Paste and run this script
-- 4. Verify the output shows successful completion
-- 5. Test signup functionality with: node test_signup_simple.cjs
-- ============================================================================