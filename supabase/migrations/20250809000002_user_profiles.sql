-- Migration: User Profiles Table
-- Description: Creates and updates user profiles table with membership and video tracking fields

-- Create or update user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name VARCHAR(100),
  username VARCHAR(50),
  phone_number VARCHAR(30),
  
  -- Membership fields
  membership_type VARCHAR(20) DEFAULT 'free' CHECK (membership_type IN ('free', 'intern', 'vip')),
  membership_level VARCHAR(10) DEFAULT 'VIP1',
  
  -- Trial status
  is_trial_active BOOLEAN DEFAULT true,
  trial_start_date DATE DEFAULT CURRENT_DATE,
  trial_end_date DATE DEFAULT (CURRENT_DATE + INTERVAL '3 days'),
  
  -- Video tracking
  videos_watched_today INTEGER DEFAULT 0,
  last_video_reset_date DATE DEFAULT CURRENT_DATE,
  
  -- Financial tracking
  total_earnings NUMERIC(12,2) DEFAULT 0,
  income_wallet_balance NUMERIC(12,2) DEFAULT 0,
  personal_wallet_balance NUMERIC(12,2) DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_plans table for tracking active VIP subscriptions
CREATE TABLE IF NOT EXISTS user_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES membership_plans(id) ON DELETE CASCADE,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired', 'cancelled')),
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create video_earnings table for tracking daily video earnings
CREATE TABLE IF NOT EXISTS video_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id UUID,
  amount NUMERIC(10,2) NOT NULL,
  membership_level VARCHAR(10),
  video_rate NUMERIC(10,2),
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed BOOLEAN DEFAULT false
);

-- Create video_watch_history table
CREATE TABLE IF NOT EXISTS video_watch_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id UUID,
  watched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  watch_date DATE DEFAULT CURRENT_DATE,
  completed BOOLEAN DEFAULT true
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_plans_user_id ON user_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_user_plans_plan_id ON user_plans(plan_id);
CREATE INDEX IF NOT EXISTS idx_user_plans_status ON user_plans(status);
CREATE INDEX IF NOT EXISTS idx_video_earnings_user_id ON video_earnings(user_id);
CREATE INDEX IF NOT EXISTS idx_video_watch_history_user_id ON video_watch_history(user_id);
CREATE INDEX IF NOT EXISTS idx_video_watch_history_watch_date ON video_watch_history(watch_date);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_watch_history ENABLE ROW LEVEL SECURITY;

-- Create policies for user_profiles table
CREATE POLICY "Users can view their own profile" 
  ON user_profiles FOR SELECT 
  USING (auth.uid() IN (
    SELECT auth_user_id FROM users WHERE id = user_id
  ));

CREATE POLICY "Users can update their own profile" 
  ON user_profiles FOR UPDATE 
  USING (auth.uid() IN (
    SELECT auth_user_id FROM users WHERE id = user_id
  ));

-- Create policies for user_plans table
CREATE POLICY "Users can view their own plans" 
  ON user_plans FOR SELECT 
  USING (auth.uid() IN (
    SELECT auth_user_id FROM users WHERE id = user_id
  ));

-- Create policies for video_earnings table
CREATE POLICY "Users can view their own video earnings" 
  ON video_earnings FOR SELECT 
  USING (auth.uid() IN (
    SELECT auth_user_id FROM users WHERE id = user_id
  ));

-- Create policies for video_watch_history table
CREATE POLICY "Users can view their own watch history" 
  ON video_watch_history FOR SELECT 
  USING (auth.uid() IN (
    SELECT auth_user_id FROM users WHERE id = user_id
  ));

-- Create function to reset daily video count
CREATE OR REPLACE FUNCTION reset_daily_video_count()
RETURNS TRIGGER AS $$
BEGIN
  -- If the last reset date is not today, reset the counter
  IF (NEW.last_video_reset_date IS NULL OR NEW.last_video_reset_date < CURRENT_DATE) THEN
    NEW.videos_watched_today := 0;
    NEW.last_video_reset_date := CURRENT_DATE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to reset daily video count
DROP TRIGGER IF EXISTS trigger_reset_daily_video_count ON user_profiles;
CREATE TRIGGER trigger_reset_daily_video_count
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION reset_daily_video_count();