-- =====================================================
-- FIX MISSING TABLES AND SIGNUP ISSUES
-- =====================================================

-- 1. Create the missing 'tasks' table
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    reward DECIMAL(10,2) DEFAULT 0,
    type VARCHAR(50) DEFAULT 'daily',
    is_active BOOLEAN DEFAULT true,
    required_vip_level INTEGER DEFAULT 0,
    max_completions_per_day INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Insert sample tasks for testing
INSERT INTO public.tasks (title, description, reward, type, required_vip_level, max_completions_per_day) VALUES
('Daily Check-in', 'Complete your daily check-in to earn rewards', 10.00, 'daily', 0, 1),
('Watch Training Video', 'Watch a training video to improve your skills', 15.00, 'daily', 0, 3),
('Complete Profile', 'Fill out your complete profile information', 25.00, 'one-time', 0, 1),
('Invite a Friend', 'Invite a friend to join the platform', 50.00, 'referral', 0, 10),
('VIP Task - Advanced Trading', 'Complete advanced trading simulation', 100.00, 'daily', 1, 2),
('VIP Task - Market Analysis', 'Perform detailed market analysis', 150.00, 'daily', 2, 1),
('Premium Strategy Review', 'Review and implement premium trading strategies', 200.00, 'weekly', 3, 1)
ON CONFLICT (id) DO NOTHING;

-- 3. Create user_task_completions table to track task progress
CREATE TABLE IF NOT EXISTS public.user_task_completions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reward_earned DECIMAL(10,2) DEFAULT 0
);

-- Note: Daily uniqueness will be enforced at the application level
-- to avoid PostgreSQL immutable function issues in index expressions

-- 4. Enable RLS on tasks table
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for tasks
CREATE POLICY "Tasks are viewable by authenticated users" ON public.tasks
    FOR SELECT USING (auth.role() = 'authenticated');

-- 6. Enable RLS on user_task_completions
ALTER TABLE public.user_task_completions ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies for user_task_completions
CREATE POLICY "Users can view their own task completions" ON public.user_task_completions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own task completions" ON public.user_task_completions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 8. Grant necessary permissions
GRANT SELECT ON public.tasks TO authenticated;
GRANT SELECT, INSERT ON public.user_task_completions TO authenticated;

-- 9. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_type ON public.tasks(type);
CREATE INDEX IF NOT EXISTS idx_tasks_vip_level ON public.tasks(required_vip_level);
CREATE INDEX IF NOT EXISTS idx_user_task_completions_user_id ON public.user_task_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_task_completions_task_id ON public.user_task_completions(task_id);

-- 10. Update the user profile creation trigger to handle balance fields properly
CREATE OR REPLACE FUNCTION public.create_user_profile_from_auth()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (
        user_id,
        membership_level,
        vip_level,
        trial_tasks_completed,
        total_earnings,
        income_wallet_balance,
        personal_wallet_balance,
        daily_earnings_today,
        videos_watched_today,
        intern_trial_start_date,
        intern_trial_end_date,
        intern_trial_expired,
        last_video_reset_date,
        last_earning_reset_date
    ) VALUES (
        NEW.id,
        'trial'::membership_level,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '3 days',
        false,
        CURRENT_DATE,
        CURRENT_DATE
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Ensure the trigger exists and is active
DROP TRIGGER IF EXISTS create_user_profile_trigger ON auth.users;
CREATE TRIGGER create_user_profile_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.create_user_profile_from_auth();

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if tasks table was created successfully
SELECT 'tasks_table_check' as check_name, 
       COUNT(*) as task_count 
FROM public.tasks;

-- Check if user_task_completions table was created
SELECT 'user_task_completions_table_check' as check_name,
       COUNT(*) as completion_count
FROM public.user_task_completions;

-- Check recent user profiles
SELECT 'recent_profiles_check' as check_name,
       COUNT(*) as profile_count
FROM public.user_profiles 
WHERE created_at > NOW() - INTERVAL '1 hour';

-- Check if trigger function exists
SELECT 'trigger_function_check' as check_name,
       COUNT(*) as function_count
FROM pg_proc 
WHERE proname = 'create_user_profile_from_auth';

-- Check if trigger exists
SELECT 'trigger_check' as check_name,
       COUNT(*) as trigger_count
FROM pg_trigger 
WHERE tgname = 'create_user_profile_trigger';

COMMIT;