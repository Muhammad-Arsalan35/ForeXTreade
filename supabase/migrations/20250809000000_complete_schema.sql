-- ============================================================================
-- COMPLETE DATABASE SCHEMA FOR FOREXTREADE APPLICATION
-- ============================================================================

-- ============================================================================
-- 1. ENUM TYPES
-- ============================================================================

-- Create enum types if they don't exist
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vip_level_enum') THEN
        CREATE TYPE vip_level_enum AS ENUM ('VIP1', 'VIP2', 'VIP3', 'VIP4', 'VIP5', 'VIP6', 'VIP7', 'VIP8', 'VIP9', 'VIP10');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status_enum') THEN
        CREATE TYPE user_status_enum AS ENUM ('pending_verification', 'active', 'suspended', 'banned', 'admin');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type_enum') THEN
        CREATE TYPE transaction_type_enum AS ENUM ('deposit', 'withdrawal', 'commission', 'video_earning', 'plan_purchase');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wallet_type_enum') THEN
        CREATE TYPE wallet_type_enum AS ENUM ('income_wallet', 'personal_wallet');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_status_enum') THEN
        CREATE TYPE transaction_status_enum AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'deposit_status_enum') THEN
        CREATE TYPE deposit_status_enum AS ENUM ('initiated', 'pending', 'processing', 'completed', 'failed', 'expired');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'withdrawal_status_enum') THEN
        CREATE TYPE withdrawal_status_enum AS ENUM ('pending', 'approved', 'processing', 'completed', 'rejected', 'cancelled');
    END IF;
END $$;

-- ============================================================================
-- 2. MEMBERSHIP PLANS
-- ============================================================================

-- Create membership_plans table
CREATE TABLE IF NOT EXISTS membership_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  daily_video_limit INTEGER NOT NULL,
  price NUMERIC(12,2) NOT NULL,
  video_rate NUMERIC(10,2) NOT NULL, -- Rate per video
  duration_days INTEGER NOT NULL DEFAULT 120,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert VIP plans with their respective video limits, prices, and rates
INSERT INTO membership_plans (id, name, daily_video_limit, price, video_rate, duration_days, is_active) VALUES 
(gen_random_uuid(), 'VIP1', 5, 5000, 30, 120, true),
(gen_random_uuid(), 'VIP2', 10, 16000, 50, 120, true),
(gen_random_uuid(), 'VIP3', 16, 36000, 70, 120, true),
(gen_random_uuid(), 'VIP4', 31, 78000, 80, 120, true),
(gen_random_uuid(), 'VIP5', 50, 160000, 100, 120, true),
(gen_random_uuid(), 'VIP6', 75, 260000, 115, 120, true),
(gen_random_uuid(), 'VIP7', 100, 500000, 160, 120, true),
(gen_random_uuid(), 'VIP8', 120, 800000, 220, 120, true),
(gen_random_uuid(), 'VIP9', 150, 1200000, 260, 120, true),
(gen_random_uuid(), 'VIP10', 180, 2400000, 440, 120, true)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 3. USER MANAGEMENT
-- ============================================================================

-- Update users table if it exists, otherwise create it
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    phone_number VARCHAR(20),
    profile_avatar VARCHAR(500),
    
    -- VIP & Status Information
    vip_level vip_level_enum DEFAULT 'VIP1',
    position_title VARCHAR(100) DEFAULT 'General Employee',
    user_status user_status_enum DEFAULT 'pending_verification',
    
    -- Financial Information
    income_wallet_balance NUMERIC(15,2) DEFAULT 0.00,
    personal_wallet_balance NUMERIC(15,2) DEFAULT 0.00,
    total_earnings NUMERIC(15,2) DEFAULT 0.00,
    total_invested NUMERIC(15,2) DEFAULT 0.00,
    
    -- Referral Information
    referral_code VARCHAR(20) UNIQUE NOT NULL DEFAULT UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8)),
    referred_by UUID,
    referral_level INTEGER DEFAULT 0,
    
    -- Security
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(100),
    last_login TIMESTAMP WITH TIME ZONE,
    login_attempts INTEGER DEFAULT 0,
    account_locked_until TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (referred_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Create user_profiles table
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

-- ============================================================================
-- 4. REFERRAL SYSTEM
-- ============================================================================

-- Create referrals table for tracking direct referrals
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  level VARCHAR(1) NOT NULL CHECK (level IN ('A', 'B', 'C', 'D')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(referred_id)
);

-- Create referral_commissions table for tracking commission earnings
CREATE TABLE IF NOT EXISTS referral_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  level VARCHAR(1) NOT NULL CHECK (level IN ('A', 'B', 'C', 'D')),
  amount NUMERIC(12,2) NOT NULL,
  commission_type VARCHAR(20) NOT NULL CHECK (commission_type IN ('vip_upgrade', 'video_watching')),
  source_transaction UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Create commission_rates table for configuring commission percentages
CREATE TABLE IF NOT EXISTS commission_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level VARCHAR(1) NOT NULL CHECK (level IN ('A', 'B', 'C', 'D')),
  vip_upgrade_commission_percentage NUMERIC(5,2) NOT NULL,
  video_commission_percentage NUMERIC(5,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(level)
);

-- Insert default commission rates
INSERT INTO commission_rates (level, vip_upgrade_commission_percentage, video_commission_percentage, is_active) VALUES
('A', 10.00, 3.00, true),  -- A-Level: 10% VIP upgrade, 3% video
('B', 5.00, 1.50, true),   -- B-Level: 5% VIP upgrade, 1.5% video
('C', 2.00, 0.75, true),   -- C-Level: 2% VIP upgrade, 0.75% video
('D', 1.00, 0.25, true)    -- D-Level: 1% VIP upgrade, 0.25% video
ON CONFLICT (level) DO NOTHING;

-- Create team_structure table for tracking multi-level relationships
CREATE TABLE IF NOT EXISTS team_structure (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_member_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  level VARCHAR(1) NOT NULL CHECK (level IN ('A', 'B', 'C', 'D')),
  path TEXT NOT NULL, -- Stores the path from user to team member (e.g., 'A/B/C')
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, team_member_id)
);

-- ============================================================================
-- 5. VIDEO SYSTEM
-- ============================================================================

-- Create videos table
CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration INTEGER DEFAULT 0, -- in seconds
  reward_per_watch NUMERIC(10,2) DEFAULT 0,
  category VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create video_earnings table for tracking daily video earnings
CREATE TABLE IF NOT EXISTS video_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id UUID REFERENCES videos(id) ON DELETE SET NULL,
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
  video_id UUID REFERENCES videos(id) ON DELETE SET NULL,
  watched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  watch_date DATE DEFAULT CURRENT_DATE,
  completed BOOLEAN DEFAULT true
);

-- ============================================================================
-- 6. FINANCIAL SYSTEM
-- ============================================================================

-- Create payment_methods table
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  account_number VARCHAR(100) NOT NULL,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create deposits table
CREATE TABLE IF NOT EXISTS deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payment_method_id UUID NOT NULL REFERENCES payment_methods(id),
  amount NUMERIC(12,2) NOT NULL,
  till_id VARCHAR(100),
  payment_proof TEXT,
  sender_account_number VARCHAR(100),
  status deposit_status_enum DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Create withdrawals table
CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  account_number VARCHAR(100) NOT NULL,
  status withdrawal_status_enum DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Create transactions table for tracking all financial movements
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  transaction_type transaction_type_enum NOT NULL,
  wallet_type wallet_type_enum NOT NULL,
  reference_id UUID, -- Can reference deposits, withdrawals, etc.
  description TEXT,
  status transaction_status_enum DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 7. INDEXES
-- ============================================================================

-- Membership plans indexes
CREATE INDEX IF NOT EXISTS idx_membership_plans_name ON membership_plans(name);

-- User indexes
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by);
CREATE INDEX IF NOT EXISTS idx_users_vip_level ON users(vip_level);

-- User profiles indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- User plans indexes
CREATE INDEX IF NOT EXISTS idx_user_plans_user_id ON user_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_user_plans_plan_id ON user_plans(plan_id);
CREATE INDEX IF NOT EXISTS idx_user_plans_status ON user_plans(status);

-- Referral system indexes
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_user_id ON referral_commissions(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_from_user_id ON referral_commissions(from_user_id);
CREATE INDEX IF NOT EXISTS idx_team_structure_user_id ON team_structure(user_id);
CREATE INDEX IF NOT EXISTS idx_team_structure_team_member_id ON team_structure(team_member_id);

-- Video system indexes
CREATE INDEX IF NOT EXISTS idx_videos_is_active ON videos(is_active);
CREATE INDEX IF NOT EXISTS idx_video_earnings_user_id ON video_earnings(user_id);
CREATE INDEX IF NOT EXISTS idx_video_watch_history_user_id ON video_watch_history(user_id);
CREATE INDEX IF NOT EXISTS idx_video_watch_history_watch_date ON video_watch_history(watch_date);

-- Financial system indexes
CREATE INDEX IF NOT EXISTS idx_deposits_user_id ON deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_deposits_status ON deposits(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_type ON transactions(wallet_type);

-- ============================================================================
-- 8. ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_structure ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_watch_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 9. FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to reset daily video count
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

-- Trigger to reset daily video count
DROP TRIGGER IF EXISTS trigger_reset_daily_video_count ON user_profiles;
CREATE TRIGGER trigger_reset_daily_video_count
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION reset_daily_video_count();

-- Function to create user profile on user creation
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (user_id, full_name, username, phone_number)
  VALUES (NEW.id, NEW.full_name, NEW.username, NEW.phone_number);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create user profile
DROP TRIGGER IF EXISTS trigger_create_user_profile ON users;
CREATE TRIGGER trigger_create_user_profile
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();

-- Function to handle new user creation from auth.users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into public.users table
  INSERT INTO public.users (
    auth_user_id,
    full_name,
    username,
    phone_number,
    referral_code,
    user_status
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'phone_number', NEW.phone),
    UPPER(substr(gen_random_uuid()::text, 1, 8)),
    'active'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();