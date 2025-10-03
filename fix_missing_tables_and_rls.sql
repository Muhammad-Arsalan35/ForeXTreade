-- FIX MISSING TABLES AND RLS PERMISSION ISSUES
-- This script creates missing tables and fixes RLS policies

-- 1. CREATE USER_PROFILES TABLE (MISSING)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    username TEXT UNIQUE,
    phone_number TEXT,
    membership_type TEXT DEFAULT 'intern',
    membership_level TEXT DEFAULT 'intern',
    vip_level TEXT DEFAULT 'Intern',
    is_trial_active BOOLEAN DEFAULT true,
    intern_trial_end_date TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    trial_tasks_completed INTEGER DEFAULT 0,
    daily_video_count INTEGER DEFAULT 0,
    last_video_reset_date DATE DEFAULT CURRENT_DATE,
    referral_code TEXT UNIQUE,
    referred_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for user_profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON public.user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_referral_code ON public.user_profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_user_profiles_membership_type ON public.user_profiles(membership_type);

-- 2. CREATE TASK_COMPLETIONS TABLE (IF MISSING)
CREATE TABLE IF NOT EXISTS public.task_completions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    task_id TEXT NOT NULL,
    task_type TEXT,
    reward_earned DECIMAL(10,2) DEFAULT 0,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for task_completions
CREATE INDEX IF NOT EXISTS idx_task_completions_user_id ON public.task_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_task_id ON public.task_completions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_completed_at ON public.task_completions(completed_at);
CREATE INDEX IF NOT EXISTS idx_task_completions_completed_date ON public.task_completions(completed_date);

-- Create unique constraint to prevent duplicate daily task completions
CREATE UNIQUE INDEX IF NOT EXISTS idx_task_completions_daily_unique
ON public.task_completions(user_id, task_id, completed_date);

-- 3. CREATE TEAM_STRUCTURE TABLE (IF MISSING)
CREATE TABLE IF NOT EXISTS public.team_structure (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES auth.users(id),
    level INTEGER DEFAULT 1,
    position TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for team_structure
CREATE INDEX IF NOT EXISTS idx_team_structure_user_id ON public.team_structure(user_id);
CREATE INDEX IF NOT EXISTS idx_team_structure_parent_id ON public.team_structure(parent_id);

-- 4. ENABLE RLS ON ALL TABLES
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_structure ENABLE ROW LEVEL SECURITY;

-- 5. DROP EXISTING POLICIES (IF ANY)
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow profile creation during signup" ON public.user_profiles;

DROP POLICY IF EXISTS "Users can view own task completions" ON public.task_completions;
DROP POLICY IF EXISTS "Users can insert own task completions" ON public.task_completions;
DROP POLICY IF EXISTS "Users can update own task completions" ON public.task_completions;

DROP POLICY IF EXISTS "Users can view own team structure" ON public.team_structure;
DROP POLICY IF EXISTS "Users can insert own team structure" ON public.team_structure;

-- 6. CREATE PERMISSIVE RLS POLICIES FOR USER_PROFILES
CREATE POLICY "Allow all operations on user_profiles" ON public.user_profiles
FOR ALL USING (true) WITH CHECK (true);

-- 7. CREATE PERMISSIVE RLS POLICIES FOR TASK_COMPLETIONS  
CREATE POLICY "Allow all operations on task_completions" ON public.task_completions
FOR ALL USING (true) WITH CHECK (true);

-- 8. CREATE PERMISSIVE RLS POLICIES FOR TEAM_STRUCTURE
CREATE POLICY "Allow all operations on team_structure" ON public.team_structure
FOR ALL USING (true) WITH CHECK (true);

-- 9. GRANT PERMISSIONS TO ALL ROLES
GRANT ALL ON public.user_profiles TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.task_completions TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.team_structure TO postgres, anon, authenticated, service_role;

-- 10. CREATE TRIGGER FOR USER_PROFILES AUTO-CREATION
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    unique_username TEXT;
    counter INTEGER := 0;
BEGIN
    -- Generate unique username
    unique_username := LOWER(SPLIT_PART(NEW.email, '@', 1));
    
    -- Ensure username is unique
    WHILE EXISTS (SELECT 1 FROM public.user_profiles WHERE username = unique_username) LOOP
        counter := counter + 1;
        unique_username := LOWER(SPLIT_PART(NEW.email, '@', 1)) || counter::TEXT;
    END LOOP;
    
    -- Insert into user_profiles
    INSERT INTO public.user_profiles (
        user_id,
        full_name,
        username,
        membership_type,
        membership_level,
        vip_level,
        is_trial_active,
        intern_trial_end_date,
        trial_tasks_completed,
        referral_code
    ) VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
        unique_username,
        'intern',
        'intern', 
        'Intern',
        true,
        NOW() + INTERVAL '7 days',
        0,
        UPPER(SUBSTRING(MD5(NEW.id::TEXT), 1, 8))
    );
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in handle_new_user trigger: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 11. VERIFICATION QUERIES
SELECT 
    'user_profiles' as table_name,
    COUNT(*) as record_count
FROM public.user_profiles
UNION ALL
SELECT 
    'task_completions' as table_name,
    COUNT(*) as record_count  
FROM public.task_completions
UNION ALL
SELECT 
    'team_structure' as table_name,
    COUNT(*) as record_count
FROM public.team_structure;

-- Check RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('user_profiles', 'task_completions', 'team_structure')
ORDER BY tablename;