-- ============================================
-- TASKMASTER PLATFORM - SAFE SCHEMA APPLICATION
-- Handles existing enum types and creates missing tables
-- ============================================

-- ============================================
-- STEP 1: CREATE ENUM TYPES (IF NOT EXISTS)
-- ============================================

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vip_level_enum') THEN
        CREATE TYPE vip_level_enum AS ENUM (
          'Intern', 'VIP1', 'VIP2', 'VIP3', 'VIP4', 
          'VIP5', 'VIP6', 'VIP7', 'VIP8', 'VIP9', 'VIP10'
        );
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'referral_level_enum') THEN
        CREATE TYPE referral_level_enum AS ENUM ('A', 'B', 'C');
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type_enum') THEN
        CREATE TYPE transaction_type_enum AS ENUM (
          'deposit', 'withdrawal', 'vip_purchase', 'task_earning', 
          'referral_commission', 'video_commission', 'admin_adjustment'
        );
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wallet_type_enum') THEN
        CREATE TYPE wallet_type_enum AS ENUM ('personal', 'income');
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_status_enum') THEN
        CREATE TYPE transaction_status_enum AS ENUM ('pending', 'approved', 'rejected', 'completed');
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'deposit_status_enum') THEN
        CREATE TYPE deposit_status_enum AS ENUM ('pending', 'approved', 'rejected');
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'withdrawal_status_enum') THEN
        CREATE TYPE withdrawal_status_enum AS ENUM ('pending', 'processing', 'completed', 'rejected');
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status_enum') THEN
        CREATE TYPE task_status_enum AS ENUM ('pending', 'watching', 'completed', 'verified');
    END IF;
END $$;

-- ============================================
-- STEP 2: CREATE TABLES (IF NOT EXISTS)
-- ============================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE,
  
  -- Basic Info
  full_name VARCHAR(100) NOT NULL,
  username VARCHAR(50) NOT NULL UNIQUE,
  phone_number VARCHAR(20) NOT NULL UNIQUE,
  profile_avatar TEXT,
  
  -- VIP Status
  vip_level vip_level_enum DEFAULT 'Intern',
  current_plan_id UUID,
  
  -- Intern Trial (3 days earning period)
  trial_start_date DATE DEFAULT CURRENT_DATE,
  trial_end_date DATE DEFAULT (CURRENT_DATE + INTERVAL '3 days'),
  trial_expired BOOLEAN DEFAULT FALSE,
  days_remaining INTEGER GENERATED ALWAYS AS (
    CASE 
      WHEN trial_end_date >= CURRENT_DATE THEN (trial_end_date - CURRENT_DATE)
      ELSE 0
    END
  ) STORED,
  
  -- Wallets
  personal_wallet_balance NUMERIC(12,2) DEFAULT 0.00 CHECK (personal_wallet_balance >= 0),
  income_wallet_balance NUMERIC(12,2) DEFAULT 0.00 CHECK (income_wallet_balance >= 0),
  total_earnings NUMERIC(12,2) DEFAULT 0.00,
  total_invested NUMERIC(12,2) DEFAULT 0.00,
  
  -- Withdrawal Permission (Only VIP can withdraw)
  can_withdraw BOOLEAN DEFAULT FALSE,
  
  -- Referral System
  referral_code VARCHAR(20) NOT NULL UNIQUE DEFAULT UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8)),
  referred_by UUID,
  
  -- Daily Task Tracking
  videos_watched_today INTEGER DEFAULT 0,
  last_video_reset_date DATE DEFAULT CURRENT_DATE,
  daily_earnings_today NUMERIC(10,2) DEFAULT 0.00,
  
  -- Account Status
  is_active BOOLEAN DEFAULT TRUE,
  account_status VARCHAR(20) DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'banned')),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE
);

-- Add foreign key constraint for referred_by after table creation
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'users_referred_by_fkey'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_referred_by_fkey 
        FOREIGN KEY (referred_by) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Videos table
CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration INTEGER DEFAULT 30,
  category VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Membership plans table
CREATE TABLE IF NOT EXISTS membership_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(20) NOT NULL UNIQUE,
  vip_level TEXT NOT NULL UNIQUE,
  display_order INTEGER NOT NULL,
  
  -- Video & Earnings
  daily_video_limit INTEGER NOT NULL,
  video_rate NUMERIC(10,2) NOT NULL,
  daily_earning NUMERIC(10,2) GENERATED ALWAYS AS (daily_video_limit * video_rate) STORED,
  
  -- Pricing & Duration
  price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  duration_days INTEGER NOT NULL DEFAULT 180,
  
  -- Withdrawal Limits
  min_withdrawal_amount NUMERIC(10,2) DEFAULT 30.00,
  max_withdrawal_amount NUMERIC(12,2) DEFAULT 500000.00,
  
  -- Details
  description TEXT,
  features JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User memberships table
CREATE TABLE IF NOT EXISTS user_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plan_id UUID NOT NULL,
  previous_plan_id UUID,
  
  activated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  refund_amount NUMERIC(10,2) DEFAULT 0.00,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily video tasks table
CREATE TABLE IF NOT EXISTS daily_video_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  video_id UUID NOT NULL,
  task_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  earning_amount NUMERIC(10,2) NOT NULL,
  status task_status_enum DEFAULT 'pending',
  
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  watch_duration INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Commission rates table
CREATE TABLE IF NOT EXISTS commission_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level referral_level_enum NOT NULL UNIQUE,
  vip_upgrade_commission_percentage NUMERIC(5,2) NOT NULL,
  video_watch_commission_percentage NUMERIC(5,2) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL,
  referred_id UUID NOT NULL,
  level referral_level_enum NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Referral commissions table
CREATE TABLE IF NOT EXISTS referral_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL,
  from_user_id UUID NOT NULL,
  level referral_level_enum NOT NULL,
  commission_type VARCHAR(20) NOT NULL CHECK (commission_type IN ('vip_upgrade', 'video_watch')),
  
  source_amount NUMERIC(12,2) NOT NULL,
  commission_percentage NUMERIC(5,2) NOT NULL,
  commission_amount NUMERIC(10,2) NOT NULL,
  
  plan_level TEXT,
  source_transaction_id UUID,
  
  status VARCHAR(20) DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment methods table
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('jazzcash', 'easypaisa', 'bank_transfer')),
  account_details JSONB,
  instructions TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Deposits table
CREATE TABLE IF NOT EXISTS deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  payment_method_id UUID NOT NULL,
  
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  till_id VARCHAR(100),
  payment_proof TEXT,
  sender_account_number VARCHAR(50),
  
  status deposit_status_enum DEFAULT 'pending',
  admin_notes TEXT,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Withdrawals table
CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 30),
  processing_fee NUMERIC(10,2) NOT NULL,
  final_amount NUMERIC(12,2) NOT NULL,
  
  payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('jazzcash', 'easypaisa')),
  account_number VARCHAR(50) NOT NULL,
  
  vip_level_requirement TEXT NOT NULL,
  status withdrawal_status_enum DEFAULT 'pending',
  
  admin_notes TEXT,
  processed_by UUID,
  processed_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Wallet transactions table
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  transaction_type transaction_type_enum NOT NULL,
  wallet_type wallet_type_enum NOT NULL,
  
  amount NUMERIC(12,2) NOT NULL,
  balance_before NUMERIC(12,2) NOT NULL,
  balance_after NUMERIC(12,2) NOT NULL,
  
  description TEXT,
  reference_id UUID,
  reference_table VARCHAR(50),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Video watch history table
CREATE TABLE IF NOT EXISTS video_watch_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  video_id UUID NOT NULL,
  task_id UUID,
  watch_date DATE DEFAULT CURRENT_DATE,
  watch_duration INTEGER DEFAULT 0,
  reward_earned NUMERIC(10,2) DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin actions table
CREATE TABLE IF NOT EXISTS admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  target_user_id UUID,
  target_table VARCHAR(50),
  target_record_id UUID,
  old_values JSONB,
  new_values JSONB,
  reason TEXT,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User activity log table
CREATE TABLE IF NOT EXISTS user_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  activity_type VARCHAR(50) NOT NULL,
  activity_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  setting_type VARCHAR(20) DEFAULT 'string',
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STEP 3: ADD FOREIGN KEY CONSTRAINTS (IF NOT EXISTS)
-- ============================================

-- Add foreign key constraints safely
DO $$
BEGIN
    -- user_memberships foreign keys
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'user_memberships_user_id_fkey') THEN
        ALTER TABLE user_memberships ADD CONSTRAINT user_memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'user_memberships_plan_id_fkey') THEN
        ALTER TABLE user_memberships ADD CONSTRAINT user_memberships_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES membership_plans(id);
    END IF;
    
    -- daily_video_tasks foreign keys
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'daily_video_tasks_user_id_fkey') THEN
        ALTER TABLE daily_video_tasks ADD CONSTRAINT daily_video_tasks_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'daily_video_tasks_video_id_fkey') THEN
        ALTER TABLE daily_video_tasks ADD CONSTRAINT daily_video_tasks_video_id_fkey FOREIGN KEY (video_id) REFERENCES videos(id);
    END IF;
    
    -- referrals foreign keys
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'referrals_referrer_id_fkey') THEN
        ALTER TABLE referrals ADD CONSTRAINT referrals_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'referrals_referred_id_fkey') THEN
        ALTER TABLE referrals ADD CONSTRAINT referrals_referred_id_fkey FOREIGN KEY (referred_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
    
    -- Other foreign keys...
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'referral_commissions_referrer_id_fkey') THEN
        ALTER TABLE referral_commissions ADD CONSTRAINT referral_commissions_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'deposits_user_id_fkey') THEN
        ALTER TABLE deposits ADD CONSTRAINT deposits_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'withdrawals_user_id_fkey') THEN
        ALTER TABLE withdrawals ADD CONSTRAINT withdrawals_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'wallet_transactions_user_id_fkey') THEN
        ALTER TABLE wallet_transactions ADD CONSTRAINT wallet_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- ============================================
-- STEP 4: CREATE INDEXES (IF NOT EXISTS)
-- ============================================

-- Create indexes safely
DO $$
BEGIN
    -- Users indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_phone') THEN
        CREATE INDEX idx_users_phone ON users(phone_number);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_referral_code') THEN
        CREATE INDEX idx_users_referral_code ON users(referral_code);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_videos_active') THEN
        CREATE INDEX idx_videos_active ON videos(is_active);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_memberships_unique_active') THEN
        CREATE UNIQUE INDEX idx_user_memberships_unique_active ON user_memberships(user_id) WHERE is_active = TRUE;
    END IF;
END $$;

-- ============================================
-- STEP 5: INSERT INITIAL DATA (IF NOT EXISTS)
-- ============================================

-- Insert membership plans if they don't exist
INSERT INTO membership_plans (name, vip_level, display_order, daily_video_limit, video_rate, price, duration_days, description) 
SELECT 'Intern', 'Intern', 0, 3, 10.00, 0.00, 3, 'Free 3-day trial with 3 videos per day'
WHERE NOT EXISTS (SELECT 1 FROM membership_plans WHERE name = 'Intern');

INSERT INTO membership_plans (name, vip_level, display_order, daily_video_limit, video_rate, price, duration_days, description) 
SELECT 'VIP Level 1', 'VIP1', 1, 1, 150.00, 5000.00, 180, 'Entry level VIP - 1 video daily'
WHERE NOT EXISTS (SELECT 1 FROM membership_plans WHERE name = 'VIP Level 1');

-- Insert commission rates if they don't exist
INSERT INTO commission_rates (level, vip_upgrade_commission_percentage, video_watch_commission_percentage) 
SELECT 'A', 8.00, 3.00
WHERE NOT EXISTS (SELECT 1 FROM commission_rates WHERE level = 'A');

INSERT INTO commission_rates (level, vip_upgrade_commission_percentage, video_watch_commission_percentage) 
SELECT 'B', 4.00, 1.50
WHERE NOT EXISTS (SELECT 1 FROM commission_rates WHERE level = 'B');

INSERT INTO commission_rates (level, vip_upgrade_commission_percentage, video_watch_commission_percentage) 
SELECT 'C', 2.00, 0.75
WHERE NOT EXISTS (SELECT 1 FROM commission_rates WHERE level = 'C');

-- Insert payment methods if they don't exist
INSERT INTO payment_methods (name, type, account_details, instructions) 
SELECT 'JazzCash', 'jazzcash', '{"account_number": "03001234567", "account_name": "TaskMaster Admin"}', 'Send payment and submit transaction ID'
WHERE NOT EXISTS (SELECT 1 FROM payment_methods WHERE name = 'JazzCash');

-- Insert sample videos if they don't exist
INSERT INTO videos (title, description, video_url, thumbnail_url, duration, category) 
SELECT 'Product Demo', 'Watch our latest product demonstration', 'https://example.com/video1.mp4', 'https://example.com/thumb1.jpg', 30, 'advertisement'
WHERE NOT EXISTS (SELECT 1 FROM videos WHERE title = 'Product Demo');

INSERT INTO videos (title, description, video_url, thumbnail_url, duration, category) 
SELECT 'Brand Story', 'Learn about our brand journey', 'https://example.com/video2.mp4', 'https://example.com/thumb2.jpg', 45, 'promotion'
WHERE NOT EXISTS (SELECT 1 FROM videos WHERE title = 'Brand Story');

INSERT INTO videos (title, description, video_url, thumbnail_url, duration, category) 
SELECT 'Service Intro', 'Discover our services', 'https://example.com/video3.mp4', 'https://example.com/thumb3.jpg', 30, 'service'
WHERE NOT EXISTS (SELECT 1 FROM videos WHERE title = 'Service Intro');

-- Insert system settings if they don't exist
INSERT INTO system_settings (setting_key, setting_value, setting_type, description) 
SELECT 'app_name', 'TaskMaster', 'string', 'Application name'
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE setting_key = 'app_name');

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ SCHEMA APPLICATION COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '📋 All tables, indexes, and initial data have been created.';
    RAISE NOTICE '🚀 Your signup flow should now work properly!';
END $$;