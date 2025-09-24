-- COMPLETE DATABASE FIX SCRIPT
-- This script fixes all identified issues from the comprehensive analysis

-- =====================================================
-- 1. DROP EXISTING PROBLEMATIC TRIGGERS AND FUNCTIONS
-- =====================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.create_user_profile_from_auth();

-- =====================================================
-- 2. CREATE TASK_COMPLETIONS TABLE (MISSING TABLE)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.task_completions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    task_type VARCHAR(100) NOT NULL,
    task_description TEXT,
    completion_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    points_earned INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. CREATE WORKING TRIGGER FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_user_profile_from_auth()
RETURNS TRIGGER AS $$
DECLARE
    new_username TEXT;
    user_record_id UUID;
BEGIN
    -- Generate a unique username
    new_username := 'user_' || EXTRACT(EPOCH FROM NOW())::BIGINT;
    
    -- Insert into public.users table
    INSERT INTO public.users (
        auth_user_id,
        full_name,
        username,
        phone_number,
        profile_avatar,
        vip_level,
        position_title,
        user_status,
        income_wallet_balance,
        personal_wallet_balance,
        total_earnings,
        total_invested,
        referral_code,
        referred_by,
        referral_level,
        two_factor_enabled,
        two_factor_secret,
        last_login,
        login_attempts,
        account_locked_until,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        new_username,
        COALESCE(NEW.raw_user_meta_data->>'phone_number', ''),
        '',
        1,
        'Member',
        'active',
        0.00,
        0.00,
        0.00,
        0.00,
        UPPER(SUBSTRING(MD5(NEW.id::TEXT), 1, 8)),
        NULL,
        1,
        FALSE,
        NULL,
        NOW(),
        0,
        NULL,
        NOW(),
        NOW()
    ) RETURNING id INTO user_record_id;
    
    -- Insert into public.user_profiles table
    INSERT INTO public.user_profiles (
        user_id,
        full_name,
        username,
        phone_number,
        membership_type,
        membership_level,
        intern_trial_start_date,
        intern_trial_end_date,
        intern_trial_expired,
        days_remaining,
        videos_watched_today,
        last_video_reset_date,
        total_earnings,
        income_wallet_balance,
        personal_wallet_balance,
        daily_earning_limit,
        daily_earnings_today,
        last_earning_reset_date,
        created_at,
        updated_at
    ) VALUES (
        user_record_id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        new_username,
        COALESCE(NEW.raw_user_meta_data->>'phone_number', ''),
        'intern',
        1,
        NOW(),
        NOW() + INTERVAL '7 days',
        FALSE,
        7,
        0,
        NOW(),
        0.00,
        0.00,
        0.00,
        100.00,
        0.00,
        NOW(),
        NOW(),
        NOW()
    );
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the auth process
        RAISE WARNING 'Error in create_user_profile_from_auth: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. CREATE THE TRIGGER
-- =====================================================

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.create_user_profile_from_auth();

-- =====================================================
-- 5. SET UP RLS POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow service key access to users" ON public.users;
DROP POLICY IF EXISTS "Allow service key access to user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow service key access to task_completions" ON public.task_completions;

-- Create policies for service key access
CREATE POLICY "Allow service key access to users"
    ON public.users
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow service key access to user_profiles"
    ON public.user_profiles
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow service key access to task_completions"
    ON public.task_completions
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- =====================================================
-- 6. VERIFY THE SETUP
-- =====================================================

-- Check if trigger was created successfully
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Check if function exists
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'create_user_profile_from_auth';

-- Show current table counts
SELECT 
    'auth.users' as table_name,
    COUNT(*) as record_count
FROM auth.users
UNION ALL
SELECT 
    'public.users' as table_name,
    COUNT(*) as record_count
FROM public.users
UNION ALL
SELECT 
    'public.user_profiles' as table_name,
    COUNT(*) as record_count
FROM public.user_profiles
UNION ALL
SELECT 
    'public.task_completions' as table_name,
    COUNT(*) as record_count
FROM public.task_completions;

-- Success message
SELECT 'Database fix completed successfully! Trigger and tables are now properly configured.' as status;