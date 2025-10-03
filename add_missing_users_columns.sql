-- Add missing columns to users table
-- This script adds daily_task_limit and referral_count columns that are referenced in the frontend

-- Add daily_task_limit column (integer with default value)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS daily_task_limit INTEGER DEFAULT 3;

-- Add referral_count column (integer with default value)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0;

-- Update existing users to have the default values
UPDATE public.users 
SET daily_task_limit = 3 
WHERE daily_task_limit IS NULL;

UPDATE public.users 
SET referral_count = 0 
WHERE referral_count IS NULL;

-- Add comments to document the columns
COMMENT ON COLUMN public.users.daily_task_limit IS 'Maximum number of tasks a user can complete per day';
COMMENT ON COLUMN public.users.referral_count IS 'Number of users referred by this user';

-- Verify the columns were added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public' 
AND column_name IN ('daily_task_limit', 'referral_count');