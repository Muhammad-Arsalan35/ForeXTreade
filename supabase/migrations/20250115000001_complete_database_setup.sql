-- Complete Database Setup for FXTrade Application
-- This migration sets up all required tables and initial data

-- 1. Create users table with all required fields
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL DEFAULT 'User',
  username VARCHAR(100) UNIQUE NOT NULL,
  phone_number VARCHAR(20),
  email VARCHAR(255),
  vip_level VARCHAR(10) DEFAULT 'VIP1',
  user_status VARCHAR(20) DEFAULT 'active',
  referral_code VARCHAR(20) UNIQUE NOT NULL,
  referred_by VARCHAR(20),
  
  -- Wallet balances (all start at 0.00)
  personal_wallet_balance DECIMAL(12,2) DEFAULT 0.00,
  income_wallet_balance DECIMAL(12,2) DEFAULT 0.00,
  total_earnings DECIMAL(12,2) DEFAULT 0.00,
  
  -- Task tracking
  tasks_completed_today INTEGER DEFAULT 0,
  daily_task_limit INTEGER DEFAULT 5,
  last_task_reset DATE DEFAULT CURRENT_DATE,
  
  -- Referral tracking
  referral_count INTEGER DEFAULT 0,
  
  -- Profile info
  position_title VARCHAR(100) DEFAULT 'Member',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create membership_plans table
CREATE TABLE IF NOT EXISTS membership_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  daily_video_limit INTEGER NOT NULL,
  duration_days INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create user_plans table for active subscriptions
CREATE TABLE IF NOT EXISTS user_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES membership_plans(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create task_completions table
CREATE TABLE IF NOT EXISTS task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id VARCHAR(100) NOT NULL,
  task_key VARCHAR(200),
  task_type VARCHAR(50) DEFAULT 'video',
  reward_earned DECIMAL(10,2) DEFAULT 0.00,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_id VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, task_id, DATE(completed_at))
);

-- 5. Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_type VARCHAR(50) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'completed',
  reference_id VARCHAR(100),
  reference_type VARCHAR(50),
  balance_before DECIMAL(12,2),
  balance_after DECIMAL(12,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT,
  duration_seconds INTEGER DEFAULT 30,
  base_reward DECIMAL(10,2) DEFAULT 30.00,
  image_url TEXT,
  video_url TEXT,
  min_vip_level VARCHAR(10),
  task_status VARCHAR(20) DEFAULT 'active',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Create videos table
CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration INTEGER DEFAULT 30,
  category VARCHAR(100) DEFAULT 'Commercial',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Create referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referral_code VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(referred_id)
);

-- 9. Create team_structure table
CREATE TABLE IF NOT EXISTS team_structure (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  level INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(referred_id)
);

-- 10. Create vip_upgrades table
CREATE TABLE IF NOT EXISTS vip_upgrades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_level VARCHAR(10),
  to_level VARCHAR(10) NOT NULL,
  upgrade_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'completed',
  upgrade_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default membership plans
INSERT INTO membership_plans (name, description, price, daily_video_limit, duration_days) VALUES
('VIP1', 'Basic Plan', 0.00, 5, 30),
('VIP2', 'Silver Plan', 100.00, 10, 30),
('VIP3', 'Gold Plan', 300.00, 16, 30),
('VIP4', 'Platinum Plan', 500.00, 31, 30),
('VIP5', 'Diamond Plan', 1000.00, 50, 30),
('VIP6', 'Premium Plan', 2000.00, 75, 30),
('VIP7', 'Elite Plan', 5000.00, 100, 30),
('VIP8', 'Pro Plan', 10000.00, 120, 30),
('VIP9', 'Master Plan', 20000.00, 150, 30),
('VIP10', 'Admin Plan', 50000.00, 180, 30)
ON CONFLICT (name) DO NOTHING;

-- Insert sample tasks
INSERT INTO tasks (title, category, description, duration_seconds, base_reward, min_vip_level) VALUES
('Watch Commercial Video 1', 'Commercial Advertisement', 'Watch this short commercial video to earn rewards', 30, 30.00, 'VIP1'),
('Watch Commercial Video 2', 'Commercial Advertisement', 'Watch this short commercial video to earn rewards', 30, 30.00, 'VIP1'),
('Watch Commercial Video 3', 'Commercial Advertisement', 'Watch this short commercial video to earn rewards', 30, 30.00, 'VIP1'),
('Watch Commercial Video 4', 'Commercial Advertisement', 'Watch this short commercial video to earn rewards', 30, 30.00, 'VIP1'),
('Watch Commercial Video 5', 'Commercial Advertisement', 'Watch this short commercial video to earn rewards', 30, 30.00, 'VIP1'),
('Premium Video Task 1', 'Premium Content', 'Watch this premium video content', 60, 50.00, 'VIP2'),
('Premium Video Task 2', 'Premium Content', 'Watch this premium video content', 60, 50.00, 'VIP2'),
('Premium Video Task 3', 'Premium Content', 'Watch this premium video content', 60, 50.00, 'VIP2'),
('Elite Video Task 1', 'Elite Content', 'Watch this elite video content', 90, 100.00, 'VIP5'),
('Elite Video Task 2', 'Elite Content', 'Watch this elite video content', 90, 100.00, 'VIP5')
ON CONFLICT DO NOTHING;

-- Insert sample videos
INSERT INTO videos (title, description, video_url, thumbnail_url, duration, category) VALUES
('Sample Commercial 1', 'Watch this commercial to earn rewards', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', '/src/assets/task-commercial.jpg', 30, 'Commercial'),
('Sample Commercial 2', 'Watch this commercial to earn rewards', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', '/src/assets/task-commercial.jpg', 30, 'Commercial'),
('Sample Commercial 3', 'Watch this commercial to earn rewards', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', '/src/assets/task-commercial.jpg', 30, 'Commercial'),
('Sample Commercial 4', 'Watch this commercial to earn rewards', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', '/src/assets/task-commercial.jpg', 30, 'Commercial'),
('Sample Commercial 5', 'Watch this commercial to earn rewards', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4', '/src/assets/task-commercial.jpg', 30, 'Commercial')
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_vip_level ON users(vip_level);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_task_completions_user_id ON task_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_completed_at ON task_completions(completed_at);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_user_plans_user_id ON user_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_user_plans_active ON user_plans(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_tasks_active ON tasks(is_active, task_status);
CREATE INDEX IF NOT EXISTS idx_videos_active ON videos(is_active);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_structure ENABLE ROW LEVEL SECURITY;
ALTER TABLE vip_upgrades ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = auth_user_id);

-- RLS Policies for task_completions table
CREATE POLICY "Users can view own task completions" ON task_completions
  FOR SELECT USING (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id));

CREATE POLICY "Users can insert own task completions" ON task_completions
  FOR INSERT WITH CHECK (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id));

-- RLS Policies for transactions table
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id));

CREATE POLICY "Users can insert own transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id));

-- RLS Policies for user_plans table
CREATE POLICY "Users can view own plans" ON user_plans
  FOR SELECT USING (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id));

CREATE POLICY "Users can insert own plans" ON user_plans
  FOR INSERT WITH CHECK (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id));

-- RLS Policies for referrals table
CREATE POLICY "Users can view own referrals" ON referrals
  FOR SELECT USING (auth.uid() = (SELECT auth_user_id FROM users WHERE id = referrer_id) OR 
                   auth.uid() = (SELECT auth_user_id FROM users WHERE id = referred_id));

-- RLS Policies for team_structure table
CREATE POLICY "Users can view own team" ON team_structure
  FOR SELECT USING (auth.uid() = (SELECT auth_user_id FROM users WHERE id = referrer_id) OR 
                   auth.uid() = (SELECT auth_user_id FROM users WHERE id = referred_id));

-- RLS Policies for vip_upgrades table
CREATE POLICY "Users can view own upgrades" ON vip_upgrades
  FOR SELECT USING (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id));

CREATE POLICY "Users can insert own upgrades" ON vip_upgrades
  FOR INSERT WITH CHECK (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id));

-- Create function to update daily task limits based on VIP level
CREATE OR REPLACE FUNCTION update_daily_task_limit()
RETURNS TRIGGER AS $$
BEGIN
  -- Update daily task limit based on VIP level
  CASE NEW.vip_level
    WHEN 'VIP1' THEN NEW.daily_task_limit := 5;
    WHEN 'VIP2' THEN NEW.daily_task_limit := 10;
    WHEN 'VIP3' THEN NEW.daily_task_limit := 16;
    WHEN 'VIP4' THEN NEW.daily_task_limit := 31;
    WHEN 'VIP5' THEN NEW.daily_task_limit := 50;
    WHEN 'VIP6' THEN NEW.daily_task_limit := 75;
    WHEN 'VIP7' THEN NEW.daily_task_limit := 100;
    WHEN 'VIP8' THEN NEW.daily_task_limit := 120;
    WHEN 'VIP9' THEN NEW.daily_task_limit := 150;
    WHEN 'VIP10' THEN NEW.daily_task_limit := 180;
    ELSE NEW.daily_task_limit := 5;
  END CASE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update daily task limit
CREATE TRIGGER trigger_update_daily_task_limit
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_task_limit();

-- Create function to reset daily task count at midnight
CREATE OR REPLACE FUNCTION reset_daily_task_count()
RETURNS void AS $$
BEGIN
  UPDATE users 
  SET tasks_completed_today = 0, last_task_reset = CURRENT_DATE
  WHERE last_task_reset < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Create function to get user's current daily limit
CREATE OR REPLACE FUNCTION get_user_daily_limit(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  user_vip_level VARCHAR(10);
  daily_limit INTEGER;
BEGIN
  SELECT vip_level INTO user_vip_level
  FROM users 
  WHERE auth_user_id = user_uuid;
  
  CASE user_vip_level
    WHEN 'VIP1' THEN daily_limit := 5;
    WHEN 'VIP2' THEN daily_limit := 10;
    WHEN 'VIP3' THEN daily_limit := 16;
    WHEN 'VIP4' THEN daily_limit := 31;
    WHEN 'VIP5' THEN daily_limit := 50;
    WHEN 'VIP6' THEN daily_limit := 75;
    WHEN 'VIP7' THEN daily_limit := 100;
    WHEN 'VIP8' THEN daily_limit := 120;
    WHEN 'VIP9' THEN daily_limit := 150;
    WHEN 'VIP10' THEN daily_limit := 180;
    ELSE daily_limit := 5;
  END CASE;
  
  RETURN daily_limit;
END;
$$ LANGUAGE plpgsql;
