-- Add task_completions table for persistent task tracking
CREATE TABLE IF NOT EXISTS task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id VARCHAR(100) NOT NULL, -- Can be UUID for real tasks or custom ID for videos/synthetic tasks
  task_key VARCHAR(200), -- Human readable task identifier
  task_type VARCHAR(50) DEFAULT 'video', -- 'video', 'synthetic', 'real_task'
  reward_earned NUMERIC(10,2) DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_id VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, task_id, DATE(completed_at)) -- Prevent duplicate completions per day
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_task_completions_user_id ON task_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_completed_at ON task_completions(completed_at);
CREATE INDEX IF NOT EXISTS idx_task_completions_task_id ON task_completions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_user_date ON task_completions(user_id, DATE(completed_at));

-- Enable RLS
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own task completions" ON task_completions
  FOR SELECT USING (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id));

CREATE POLICY "Users can insert own task completions" ON task_completions
  FOR INSERT WITH CHECK (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id));

CREATE POLICY "Users can update own task completions" ON task_completions
  FOR UPDATE USING (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id));