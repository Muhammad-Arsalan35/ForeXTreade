-- Add missing columns to users table
-- These columns were defined in the schema but appear to be missing from the actual database

-- Add daily_task_limit column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' 
                   AND column_name = 'daily_task_limit' 
                   AND table_schema = 'public') THEN
        ALTER TABLE public.users ADD COLUMN daily_task_limit INTEGER DEFAULT 5;
        RAISE NOTICE 'Added daily_task_limit column to users table';
    ELSE
        RAISE NOTICE 'daily_task_limit column already exists';
    END IF;
END $$;

-- Add referral_count column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' 
                   AND column_name = 'referral_count' 
                   AND table_schema = 'public') THEN
        ALTER TABLE public.users ADD COLUMN referral_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added referral_count column to users table';
    ELSE
        RAISE NOTICE 'referral_count column already exists';
    END IF;
END $$;

-- Update existing users to have default values for these columns
UPDATE public.users 
SET daily_task_limit = 5 
WHERE daily_task_limit IS NULL;

UPDATE public.users 
SET referral_count = 0 
WHERE referral_count IS NULL;

-- Add comments to document the columns
COMMENT ON COLUMN public.users.daily_task_limit IS 'Maximum number of tasks a user can complete per day';
COMMENT ON COLUMN public.users.referral_count IS 'Number of users referred by this user';