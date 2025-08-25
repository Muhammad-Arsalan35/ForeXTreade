-- Database Schema for Task System
-- Run this in your Supabase SQL editor when ready

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT,
  duration INTEGER NOT NULL, -- in seconds
  base_reward DECIMAL(10,2) NOT NULL, -- base reward in PKR
  image_url TEXT,
  video_url TEXT,
  is_active BOOLEAN DEFAULT true,
  daily_limit INTEGER DEFAULT 1, -- how many times per day a user can complete this task
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create task_completions table
CREATE TABLE IF NOT EXISTS task_completions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  task_id UUID REFERENCES tasks(id) NOT NULL,
  reward_earned DECIMAL(10,2) NOT NULL,
  user_level INTEGER NOT NULL, -- user's level when task was completed
  level_multiplier DECIMAL(3,2) NOT NULL, -- multiplier applied
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, task_id, DATE(completed_at)) -- prevent multiple completions per day
);

-- Create user_levels table for level-based earnings
CREATE TABLE IF NOT EXISTS user_levels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  level INTEGER UNIQUE NOT NULL,
  name VARCHAR(50) NOT NULL,
  multiplier DECIMAL(3,2) NOT NULL, -- earnings multiplier
  daily_task_limit INTEGER NOT NULL,
  min_deposit DECIMAL(10,2) NOT NULL, -- minimum deposit required for this level
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default user levels
INSERT INTO user_levels (level, name, multiplier, daily_task_limit, min_deposit) VALUES
  (1, 'Basic', 1.0, 10, 0),
  (2, 'Silver', 1.5, 15, 100),
  (3, 'Gold', 2.0, 20, 500),
  (4, 'Platinum', 2.5, 25, 1000),
  (5, 'Diamond', 3.0, 30, 2000)
ON CONFLICT (level) DO NOTHING;

-- Insert sample tasks
INSERT INTO tasks (title, category, description, duration, base_reward, image_url) VALUES
  ('Watch Product Advertisement', 'Commercial Advertisement', 'Watch this 5-second product advertisement to earn money', 5, 50.00, '/src/assets/task-commercial.jpg'),
  ('Watch Brand Video', 'Brand Promotion', 'Watch this 10-second brand video to earn money', 10, 100.00, '/src/assets/task-commercial.jpg'),
  ('Watch Service Ad', 'Service Advertisement', 'Watch this 8-second service advertisement to earn money', 8, 80.00, '/src/assets/task-commercial.jpg'),
  ('Watch Movie Trailer', 'Film Publicity', 'Watch this 15-second movie trailer to earn money', 15, 150.00, '/src/assets/task-commercial.jpg'),
  ('Watch Clothing Collection', 'Commodity Advertising', 'Watch this 12-second clothing collection video to earn money', 12, 120.00, '/src/assets/task-commercial.jpg')
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_task_completions_user_id ON task_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_task_id ON task_completions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_completed_at ON task_completions(completed_at);
CREATE INDEX IF NOT EXISTS idx_tasks_is_active ON tasks(is_active);
CREATE INDEX IF NOT EXISTS idx_user_levels_level ON user_levels(level);

-- Row Level Security (RLS) policies
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_levels ENABLE ROW LEVEL SECURITY;

-- Anyone can view active tasks
CREATE POLICY "Anyone can view active tasks" ON tasks
  FOR SELECT USING (is_active = true);

-- Users can only see their own task completions
CREATE POLICY "Users can view own task completions" ON task_completions
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own task completions
CREATE POLICY "Users can insert own task completions" ON task_completions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Anyone can view user levels
CREATE POLICY "Anyone can view user levels" ON user_levels
  FOR SELECT USING (true);

-- Function to get user's current level based on total deposits
CREATE OR REPLACE FUNCTION get_user_level(user_deposits DECIMAL)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT level 
    FROM user_levels 
    WHERE min_deposit <= user_deposits 
    ORDER BY level DESC 
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get user's level data
CREATE OR REPLACE FUNCTION get_user_level_data(user_deposits DECIMAL)
RETURNS TABLE (
  level INTEGER,
  name VARCHAR(50),
  multiplier DECIMAL(3,2),
  daily_task_limit INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT ul.level, ul.name, ul.multiplier, ul.daily_task_limit
  FROM user_levels ul
  WHERE ul.min_deposit <= user_deposits
  ORDER BY ul.level DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;
