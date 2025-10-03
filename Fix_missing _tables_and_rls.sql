-- Fixed SQL for creating task_completions table
-- This version removes the problematic GENERATED ALWAYS AS expression

-- Create task_completions table
CREATE TABLE IF NOT EXISTS public.task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  task_id VARCHAR(255) NOT NULL,
  task_key VARCHAR(255),
  task_type VARCHAR(50) DEFAULT 'video',
  reward_earned DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_date DATE DEFAULT CURRENT_DATE,
  session_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_task_completions_user_id ON public.task_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_completed_date ON public.task_completions(completed_date);
CREATE INDEX IF NOT EXISTS idx_task_completions_task_id ON public.task_completions(task_id);

-- Create unique constraint for daily task completion
CREATE UNIQUE INDEX IF NOT EXISTS idx_task_completions_user_task_daily 
ON public.task_completions(user_id, task_id, completed_date);

-- Enable Row Level Security
ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own task completions" ON public.task_completions
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own task completions" ON public.task_completions
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own task completions" ON public.task_completions
  FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Create a trigger to automatically set completed_date from completed_at
CREATE OR REPLACE FUNCTION set_completed_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.completed_date = DATE(NEW.completed_at);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_completed_date
  BEFORE INSERT OR UPDATE ON public.task_completions
  FOR EACH ROW
  EXECUTE FUNCTION set_completed_date();