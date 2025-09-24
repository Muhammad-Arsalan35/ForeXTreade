-- Add unique constraint for daily task completion (working version)
-- First, let's add a computed column for the date
ALTER TABLE task_completions 
ADD COLUMN IF NOT EXISTS completed_date DATE GENERATED ALWAYS AS (completed_at::date) STORED;

-- Create the unique index using the computed column
CREATE UNIQUE INDEX IF NOT EXISTS idx_task_completions_daily_unique 
ON task_completions(user_id, task_id, completed_date);




