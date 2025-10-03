-- MANUAL FIX FOR MISSING USER COLUMNS
-- Copy and paste this SQL into the Supabase SQL Editor to fix the missing columns

-- Add daily_task_limit column
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS daily_task_limit INTEGER DEFAULT 5;

-- Add referral_count column  
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0;

-- Update existing users to have default values
UPDATE public.users SET daily_task_limit = 5 WHERE daily_task_limit IS NULL;
UPDATE public.users SET referral_count = 0 WHERE referral_count IS NULL;

-- Verify the columns were added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public' 
AND column_name IN ('daily_task_limit', 'referral_count');