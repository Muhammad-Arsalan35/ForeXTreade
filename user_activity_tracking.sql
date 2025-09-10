-- ============================================================================
-- USER ACTIVITY TRACKING SYSTEM
-- ============================================================================

-- Create user_activities table for comprehensive activity tracking
CREATE TABLE IF NOT EXISTS user_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL, -- 'login', 'logout', 'deposit', 'withdrawal', 'task_complete', 'video_watch', 'referral_signup', 'vip_upgrade', etc.
  activity_data JSONB, -- Store additional data like amounts, task details, etc.
  ip_address INET,
  user_agent TEXT,
  session_id VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_sessions table for session tracking
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id VARCHAR(100) UNIQUE NOT NULL,
  ip_address INET,
  user_agent TEXT,
  login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  logout_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create task_completions table (if not exists) for persistent task tracking
CREATE TABLE IF NOT EXISTS task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id VARCHAR(100) NOT NULL, -- Can be UUID for real tasks or custom ID for videos/synthetic tasks
  task_key VARCHAR(200), -- Human readable task identifier
  task_type VARCHAR(50) DEFAULT 'video', -- 'video', 'synthetic', 'real_task'
  reward_earned NUMERIC(10,2) DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_id VARCHAR(100),
  UNIQUE(user_id, task_id, DATE(completed_at)) -- Prevent duplicate completions per day
);

-- Create daily_user_stats table for aggregated daily statistics
CREATE TABLE IF NOT EXISTS daily_user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stat_date DATE NOT NULL DEFAULT CURRENT_DATE,
  tasks_completed INTEGER DEFAULT 0,
  videos_watched INTEGER DEFAULT 0,
  earnings_today NUMERIC(10,2) DEFAULT 0,
  login_count INTEGER DEFAULT 0,
  session_duration_minutes INTEGER DEFAULT 0,
  referrals_made INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, stat_date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_activity_type ON user_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON user_activities(created_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_task_completions_user_id ON task_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_completed_at ON task_completions(completed_at);
CREATE INDEX IF NOT EXISTS idx_task_completions_task_id ON task_completions(task_id);
CREATE INDEX IF NOT EXISTS idx_daily_user_stats_user_id ON daily_user_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_user_stats_stat_date ON daily_user_stats(stat_date);

-- Enable RLS
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_user_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own activities" ON user_activities
  FOR SELECT USING (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id));

CREATE POLICY "Users can insert own activities" ON user_activities
  FOR INSERT WITH CHECK (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id));

CREATE POLICY "Users can view own sessions" ON user_sessions
  FOR SELECT USING (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id));

CREATE POLICY "Users can insert own sessions" ON user_sessions
  FOR INSERT WITH CHECK (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id));

CREATE POLICY "Users can view own task completions" ON task_completions
  FOR SELECT USING (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id));

CREATE POLICY "Users can insert own task completions" ON task_completions
  FOR INSERT WITH CHECK (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id));

CREATE POLICY "Users can view own daily stats" ON daily_user_stats
  FOR SELECT USING (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id));

CREATE POLICY "Users can insert own daily stats" ON daily_user_stats
  FOR INSERT WITH CHECK (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id));

-- Function to track user activity
CREATE OR REPLACE FUNCTION track_user_activity(
  p_user_id UUID,
  p_activity_type VARCHAR(50),
  p_activity_data JSONB DEFAULT NULL,
  p_session_id VARCHAR(100) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  activity_id UUID;
BEGIN
  INSERT INTO user_activities (user_id, activity_type, activity_data, session_id)
  VALUES (p_user_id, p_activity_type, p_activity_data, p_session_id)
  RETURNING id INTO activity_id;
  
  -- Update last activity in session
  IF p_session_id IS NOT NULL THEN
    UPDATE user_sessions 
    SET last_activity_at = NOW() 
    WHERE session_id = p_session_id AND is_active = true;
  END IF;
  
  RETURN activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to start user session
CREATE OR REPLACE FUNCTION start_user_session(
  p_user_id UUID,
  p_session_id VARCHAR(100),
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  session_id UUID;
BEGIN
  -- End any existing active sessions for this user
  UPDATE user_sessions 
  SET is_active = false, logout_at = NOW() 
  WHERE user_id = p_user_id AND is_active = true;
  
  -- Create new session
  INSERT INTO user_sessions (user_id, session_id, ip_address, user_agent)
  VALUES (p_user_id, p_session_id, p_ip_address, p_user_agent)
  RETURNING id INTO session_id;
  
  -- Track login activity
  PERFORM track_user_activity(p_user_id, 'login', NULL, p_session_id);
  
  RETURN session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to end user session
CREATE OR REPLACE FUNCTION end_user_session(
  p_session_id VARCHAR(100)
)
RETURNS VOID AS $$
DECLARE
  session_record RECORD;
BEGIN
  -- Get session details
  SELECT * INTO session_record 
  FROM user_sessions 
  WHERE session_id = p_session_id AND is_active = true;
  
  IF FOUND THEN
    -- Update session
    UPDATE user_sessions 
    SET is_active = false, logout_at = NOW()
    WHERE session_id = p_session_id;
    
    -- Track logout activity
    PERFORM track_user_activity(
      session_record.user_id, 
      'logout', 
      jsonb_build_object(
        'session_duration_minutes', 
        EXTRACT(EPOCH FROM (NOW() - session_record.login_at)) / 60
      ), 
      p_session_id
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update daily stats
CREATE OR REPLACE FUNCTION update_daily_user_stats(
  p_user_id UUID,
  p_stat_date DATE DEFAULT CURRENT_DATE
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO daily_user_stats (
    user_id, 
    stat_date, 
    tasks_completed, 
    videos_watched, 
    earnings_today,
    login_count,
    session_duration_minutes,
    referrals_made
  )
  SELECT 
    p_user_id,
    p_stat_date,
    COALESCE((
      SELECT COUNT(*) 
      FROM task_completions 
      WHERE user_id = p_user_id 
      AND DATE(completed_at) = p_stat_date
    ), 0),
    COALESCE((
      SELECT COUNT(*) 
      FROM task_completions 
      WHERE user_id = p_user_id 
      AND DATE(completed_at) = p_stat_date
      AND task_type = 'video'
    ), 0),
    COALESCE((
      SELECT SUM(reward_earned) 
      FROM task_completions 
      WHERE user_id = p_user_id 
      AND DATE(completed_at) = p_stat_date
    ), 0),
    COALESCE((
      SELECT COUNT(*) 
      FROM user_activities 
      WHERE user_id = p_user_id 
      AND activity_type = 'login'
      AND DATE(created_at) = p_stat_date
    ), 0),
    COALESCE((
      SELECT SUM(EXTRACT(EPOCH FROM (logout_at - login_at)) / 60)
      FROM user_sessions 
      WHERE user_id = p_user_id 
      AND DATE(login_at) = p_stat_date
      AND is_active = false
    ), 0),
    COALESCE((
      SELECT COUNT(*) 
      FROM user_activities 
      WHERE user_id = p_user_id 
      AND activity_type = 'referral_signup'
      AND DATE(created_at) = p_stat_date
    ), 0)
  ON CONFLICT (user_id, stat_date) 
  DO UPDATE SET
    tasks_completed = EXCLUDED.tasks_completed,
    videos_watched = EXCLUDED.videos_watched,
    earnings_today = EXCLUDED.earnings_today,
    login_count = EXCLUDED.login_count,
    session_duration_minutes = EXCLUDED.session_duration_minutes,
    referrals_made = EXCLUDED.referrals_made,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
