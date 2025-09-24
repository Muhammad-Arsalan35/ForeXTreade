-- Add unique constraint for daily task completion (simple approach)
-- Option 1: Create a partial unique index (recommended)
CREATE UNIQUE INDEX IF NOT EXISTS idx_task_completions_daily_unique 
ON task_completions(user_id, task_id) 
WHERE completed_at >= CURRENT_DATE;

-- Option 2: If you want to prevent duplicates for the same day, use this instead:
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_task_completions_daily_unique 
-- ON task_completions(user_id, task_id, DATE(completed_at));




