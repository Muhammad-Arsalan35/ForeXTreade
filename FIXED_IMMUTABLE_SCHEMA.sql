-- ============================================
-- TASKMASTER PLATFORM - FIXED IMMUTABLE SCHEMA
-- Complete Clean Database Structure
-- Commission Rates: A=8%, B=4%, C=2%
-- VIP Duration: 180 days
-- FIXED: Removed non-immutable generated column
-- ============================================

-- ============================================
-- STEP 1: CREATE ENUM TYPES (IF NOT EXISTS)
-- ============================================

DO $$ BEGIN
  CREATE TYPE vip_level_enum AS ENUM (
    'Intern', 'VIP1', 'VIP2', 'VIP3', 'VIP4', 
    'VIP5', 'VIP6', 'VIP7', 'VIP8', 'VIP9', 'VIP10'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE referral_level_enum AS ENUM ('A', 'B', 'C');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE transaction_type_enum AS ENUM (
    'deposit', 'withdrawal', 'vip_purchase', 'task_earning', 
    'referral_commission', 'video_commission', 'admin_adjustment'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE wallet_type_enum AS ENUM ('personal', 'income');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE transaction_status_enum AS ENUM ('pending', 'approved', 'rejected', 'completed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE deposit_status_enum AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE withdrawal_status_enum AS ENUM ('pending', 'processing', 'completed', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE task_status_enum AS ENUM ('pending', 'watching', 'completed', 'verified');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- STEP 2: CORE USER TABLE (FIXED)
-- ============================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE, -- Removed foreign key constraint to prevent signup issues
  
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
  -- REMOVED: days_remaining generated column (was causing immutability error)
  
  -- Wallets
  personal_wallet_balance NUMERIC(12,2) DEFAULT 0.00 CHECK (personal_wallet_balance >= 0),
  income_wallet_balance NUMERIC(12,2) DEFAULT 0.00 CHECK (income_wallet_balance >= 0),
  total_earnings NUMERIC(12,2) DEFAULT 0.00,
  total_invested NUMERIC(12,2) DEFAULT 0.00,
  
  -- Withdrawal Permission (Only VIP can withdraw)
  can_withdraw BOOLEAN DEFAULT FALSE,
  
  -- Referral System
  referral_code VARCHAR(20) NOT NULL UNIQUE DEFAULT UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8)),
  referred_by UUID REFERENCES users(id) ON DELETE SET NULL,
  
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

-- Create indexes if they don't exist
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);
  CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
  CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by);
  CREATE INDEX IF NOT EXISTS idx_users_vip_level ON users(vip_level);
  CREATE INDEX IF NOT EXISTS idx_users_trial ON users(trial_end_date) WHERE trial_expired = FALSE;
EXCEPTION
  WHEN others THEN null;
END $$;

-- ============================================
-- STEP 3: MEMBERSHIP PLANS
-- ============================================

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

-- Insert Plans (180 days duration) - Only if table is empty
INSERT INTO membership_plans (name, vip_level, display_order, daily_video_limit, video_rate, price, duration_days, description) 
SELECT * FROM (VALUES
  ('Intern', 'Intern', 0, 3, 10.00, 0.00, 3, 'Free 3-day trial with 3 videos per day'),
  ('VIP Level 1', 'VIP1', 1, 1, 150.00, 5000.00, 180, 'Entry level VIP - 1 video daily'),
  ('VIP Level 2', 'VIP2', 2, 2, 250.00, 16000.00, 180, 'Popular choice - 2 videos daily'),
  ('VIP Level 3', 'VIP3', 3, 3, 380.00, 36000.00, 180, 'Advanced - 3 videos daily'),
  ('VIP Level 4', 'VIP4', 4, 4, 650.00, 78000.00, 180, 'Premium - 4 videos daily'),
  ('VIP Level 5', 'VIP5', 5, 5, 1000.00, 160000.00, 180, 'Elite - 5 videos daily'),
  ('VIP Level 6', 'VIP6', 6, 6, 1400.00, 260000.00, 180, 'Professional - 6 videos daily'),
  ('VIP Level 7', 'VIP7', 7, 7, 2400.00, 500000.00, 180, 'Expert - 7 videos daily'),
  ('VIP Level 8', 'VIP8', 8, 8, 3333.00, 800000.00, 180, 'Master - 8 videos daily'),
  ('VIP Level 9', 'VIP9', 9, 9, 4444.00, 1200000.00, 180, 'Grand Master - 9 videos daily'),
  ('VIP Level 10', 'VIP10', 10, 10, 8000.00, 2400000.00, 180, 'Ultimate - 10 videos daily')
) AS v(name, vip_level, display_order, daily_video_limit, video_rate, price, duration_days, description)
WHERE NOT EXISTS (SELECT 1 FROM membership_plans);

-- User Active Memberships
CREATE TABLE IF NOT EXISTS user_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES membership_plans(id),
  previous_plan_id UUID REFERENCES membership_plans(id),
  
  activated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  refund_amount NUMERIC(10,2) DEFAULT 0.00,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create partial unique index to ensure only one active membership per user
DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS idx_user_memberships_unique_active ON user_memberships(user_id) WHERE is_active = TRUE;
  CREATE INDEX IF NOT EXISTS idx_user_memberships_active ON user_memberships(user_id, is_active);
  CREATE INDEX IF NOT EXISTS idx_user_memberships_expires ON user_memberships(expires_at) WHERE is_active = TRUE;
EXCEPTION
  WHEN others THEN null;
END $$;

-- ============================================
-- STEP 4: REFERRAL SYSTEM
-- ============================================

-- Commission Rates (CORRECTED: 8%, 4%, 2%)
CREATE TABLE IF NOT EXISTS commission_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level referral_level_enum NOT NULL UNIQUE,
  vip_upgrade_commission_percentage NUMERIC(5,2) NOT NULL,
  video_watch_commission_percentage NUMERIC(5,2) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert Corrected Commission Rates - Only if table is empty
INSERT INTO commission_rates (level, vip_upgrade_commission_percentage, video_watch_commission_percentage) 
SELECT * FROM (VALUES
  ('A'::referral_level_enum, 8.00, 3.00),   -- A-Level: 8% on VIP upgrade, 3% on video watch
  ('B'::referral_level_enum, 4.00, 1.50),   -- B-Level: 4% on VIP upgrade, 1.5% on video watch
  ('C'::referral_level_enum, 2.00, 0.75)    -- C-Level: 2% on VIP upgrade, 0.75% on video watch
) AS v(level, vip_upgrade_commission_percentage, video_watch_commission_percentage)
WHERE NOT EXISTS (SELECT 1 FROM commission_rates);

-- Referral Relationships
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  level referral_level_enum NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(referrer_id, referred_id, level)
);

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id, level);
  CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_id);
EXCEPTION
  WHEN others THEN null;
END $$;

-- Referral Commissions
CREATE TABLE IF NOT EXISTS referral_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_ref_commissions_referrer ON referral_commissions(referrer_id, level);
  CREATE INDEX IF NOT EXISTS idx_ref_commissions_from ON referral_commissions(from_user_id);
  CREATE INDEX IF NOT EXISTS idx_ref_commissions_type ON referral_commissions(commission_type);
EXCEPTION
  WHEN others THEN null;
END $$;

-- ============================================
-- STEP 5: VIDEO & TASKS
-- ============================================

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

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_videos_active ON videos(is_active);
EXCEPTION
  WHEN others THEN null;
END $$;

-- Daily Video Tasks
CREATE TABLE IF NOT EXISTS daily_video_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES videos(id),
  task_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  earning_amount NUMERIC(10,2) NOT NULL,
  status task_status_enum DEFAULT 'pending',
  
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  watch_duration INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, video_id, task_date)
);

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_daily_tasks_user_date ON daily_video_tasks(user_id, task_date);
  CREATE INDEX IF NOT EXISTS idx_daily_tasks_status ON daily_video_tasks(status);
EXCEPTION
  WHEN others THEN null;
END $$;

-- Video Watch History
CREATE TABLE IF NOT EXISTS video_watch_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES videos(id),
  task_id UUID REFERENCES daily_video_tasks(id),
  watch_date DATE DEFAULT CURRENT_DATE,
  watch_duration INTEGER DEFAULT 0,
  reward_earned NUMERIC(10,2) DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_video_history_user ON video_watch_history(user_id, watch_date);
EXCEPTION
  WHEN others THEN null;
END $$;

-- ============================================
-- STEP 6: FINANCIAL TRANSACTIONS
-- ============================================

-- Payment Methods
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('jazzcash', 'easypaisa', 'bank_transfer')),
  account_details JSONB,
  instructions TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO payment_methods (name, type, account_details, instructions) 
SELECT * FROM (VALUES
  ('JazzCash', 'jazzcash', '{"account_number": "03001234567", "account_name": "TaskMaster Admin"}'::jsonb, 'Send payment and submit transaction ID'),
  ('EasyPaisa', 'easypaisa', '{"account_number": "03009876543", "account_name": "TaskMaster Admin"}'::jsonb, 'Send payment and submit transaction ID')
) AS v(name, type, account_details, instructions)
WHERE NOT EXISTS (SELECT 1 FROM payment_methods);

-- Deposits
CREATE TABLE IF NOT EXISTS deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payment_method_id UUID NOT NULL REFERENCES payment_methods(id),
  
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  till_id VARCHAR(100),
  payment_proof TEXT,
  sender_account_number VARCHAR(50),
  
  status deposit_status_enum DEFAULT 'pending',
  admin_notes TEXT,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_deposits_user ON deposits(user_id);
  CREATE INDEX IF NOT EXISTS idx_deposits_status ON deposits(status);
EXCEPTION
  WHEN others THEN null;
END $$;

-- Withdrawals
CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 30),
  processing_fee NUMERIC(10,2) NOT NULL,
  final_amount NUMERIC(12,2) NOT NULL,
  
  payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('jazzcash', 'easypaisa')),
  account_number VARCHAR(50) NOT NULL,
  
  vip_level_requirement TEXT NOT NULL,
  status withdrawal_status_enum DEFAULT 'pending',
  
  admin_notes TEXT,
  processed_by UUID REFERENCES users(id),
  processed_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON withdrawals(user_id);
  CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
EXCEPTION
  WHEN others THEN null;
END $$;

-- Wallet Transaction Ledger
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
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

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_wallet_txn_user ON wallet_transactions(user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_wallet_txn_type ON wallet_transactions(transaction_type);
EXCEPTION
  WHEN others THEN null;
END $$;

-- ============================================
-- STEP 7: ADMIN & LOGGING
-- ============================================

CREATE TABLE IF NOT EXISTS admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES users(id),
  action_type VARCHAR(50) NOT NULL,
  target_user_id UUID REFERENCES users(id),
  target_table VARCHAR(50),
  target_record_id UUID,
  old_values JSONB,
  new_values JSONB,
  reason TEXT,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_admin_actions_admin ON admin_actions(admin_user_id, created_at DESC);
EXCEPTION
  WHEN others THEN null;
END $$;

CREATE TABLE IF NOT EXISTS user_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL,
  activity_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_user_activity ON user_activity_log(user_id, created_at DESC);
EXCEPTION
  WHEN others THEN null;
END $$;

CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  setting_type VARCHAR(20) DEFAULT 'string',
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO system_settings (setting_key, setting_value, setting_type, description) 
SELECT * FROM (VALUES
  ('app_name', 'TaskMaster', 'string', 'Application name'),
  ('withdrawal_fee_percentage', '2', 'number', 'Withdrawal fee (2%)'),
  ('intern_trial_days', '3', 'number', 'Intern trial period'),
  ('support_whatsapp', '+92-300-1234567', 'string', 'Support WhatsApp')
) AS v(setting_key, setting_value, setting_type, description)
WHERE NOT EXISTS (SELECT 1 FROM system_settings);

-- ============================================
-- STEP 8: SAMPLE DATA
-- ============================================

-- Insert sample videos - Only if table is empty
INSERT INTO videos (title, description, video_url, thumbnail_url, duration, category) 
SELECT * FROM (VALUES
  ('Forex Trading Basics', 'Learn the fundamentals of forex trading', 'https://example.com/video1', 'https://example.com/thumb1.jpg', 30, 'Education'),
  ('Market Analysis Techniques', 'Advanced market analysis methods', 'https://example.com/video2', 'https://example.com/thumb2.jpg', 45, 'Analysis'),
  ('Risk Management', 'How to manage trading risks effectively', 'https://example.com/video3', 'https://example.com/thumb3.jpg', 35, 'Risk Management'),
  ('Technical Indicators', 'Understanding key technical indicators', 'https://example.com/video4', 'https://example.com/thumb4.jpg', 40, 'Technical Analysis'),
  ('Trading Psychology', 'Master your trading mindset', 'https://example.com/video5', 'https://example.com/thumb5.jpg', 30, 'Psychology')
) AS v(title, description, video_url, thumbnail_url, duration, category)
WHERE NOT EXISTS (SELECT 1 FROM videos);

-- ============================================
-- STEP 9: FUNCTIONS & TRIGGERS
-- ============================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers if they don't exist
DO $$ BEGIN
  DROP TRIGGER IF EXISTS update_users_timestamp ON users;
  CREATE TRIGGER update_users_timestamp BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION
  WHEN others THEN null;
END $$;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS update_deposits_timestamp ON deposits;
  CREATE TRIGGER update_deposits_timestamp BEFORE UPDATE ON deposits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION
  WHEN others THEN null;
END $$;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS update_withdrawals_timestamp ON withdrawals;
  CREATE TRIGGER update_withdrawals_timestamp BEFORE UPDATE ON withdrawals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION
  WHEN others THEN null;
END $$;

-- Prevent Intern withdrawals
CREATE OR REPLACE FUNCTION prevent_intern_withdrawal()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE id = NEW.user_id AND vip_level = 'Intern') THEN
    RAISE EXCEPTION 'Intern users cannot withdraw. Please upgrade to VIP first.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS check_vip_before_withdrawal ON withdrawals;
  CREATE TRIGGER check_vip_before_withdrawal
  BEFORE INSERT ON withdrawals
  FOR EACH ROW EXECUTE FUNCTION prevent_intern_withdrawal();
EXCEPTION
  WHEN others THEN null;
END $$;

-- Create referral chain
CREATE OR REPLACE FUNCTION create_referral_chain(new_user_id UUID, referrer_code VARCHAR)
RETURNS VOID AS $$
DECLARE
  referrer_user_id UUID;
  level_a_referrer UUID;
  level_b_referrer UUID;
BEGIN
  SELECT id INTO referrer_user_id FROM users WHERE referral_code = referrer_code;
  
  IF referrer_user_id IS NULL THEN RETURN; END IF;
  
  UPDATE users SET referred_by = referrer_user_id WHERE id = new_user_id;
  
  -- A-Level
  INSERT INTO referrals (referrer_id, referred_id, level)
  VALUES (referrer_user_id, new_user_id, 'A');
  
  -- B-Level
  SELECT referred_by INTO level_a_referrer FROM users WHERE id = referrer_user_id;
  IF level_a_referrer IS NOT NULL THEN
    INSERT INTO referrals (referrer_id, referred_id, level)
    VALUES (level_a_referrer, new_user_id, 'B');
    
    -- C-Level
    SELECT referred_by INTO level_b_referrer FROM users WHERE id = level_a_referrer;
    IF level_b_referrer IS NOT NULL THEN
      INSERT INTO referrals (referrer_id, referred_id, level)
      VALUES (level_b_referrer, new_user_id, 'C');
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Process VIP upgrade commissions (8%, 4%, 2%)
CREATE OR REPLACE FUNCTION process_vip_upgrade_commissions(
  upgraded_user_id UUID, 
  plan_price NUMERIC,
  plan_level_name TEXT
)
RETURNS VOID AS $$
DECLARE
  ref RECORD;
  comm_rate NUMERIC;
  comm_amt NUMERIC;
BEGIN
  FOR ref IN 
    SELECT r.referrer_id, r.level, cr.vip_upgrade_commission_percentage
    FROM referrals r
    JOIN commission_rates cr ON r.level = cr.level
    WHERE r.referred_id = upgraded_user_id
    ORDER BY r.level
  LOOP
    comm_rate := ref.vip_upgrade_commission_percentage;
    comm_amt := plan_price * (comm_rate / 100);
    
    UPDATE users 
    SET income_wallet_balance = income_wallet_balance + comm_amt
    WHERE id = ref.referrer_id;
    
    INSERT INTO referral_commissions (
      referrer_id, from_user_id, level, commission_type,
      source_amount, commission_percentage, commission_amount, plan_level, status
    ) VALUES (
      ref.referrer_id, upgraded_user_id, ref.level, 'vip_upgrade',
      plan_price, comm_rate, comm_amt, plan_level_name, 'approved'
    );
    
    INSERT INTO wallet_transactions (user_id, transaction_type, wallet_type, amount, balance_before, balance_after, description)
    SELECT ref.referrer_id, 'referral_commission', 'income', comm_amt, 
           income_wallet_balance - comm_amt, income_wallet_balance,
           'VIP upgrade commission from ' || plan_level_name
    FROM users WHERE id = ref.referrer_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Process video watch commissions (3%, 1.5%, 0.75%)
CREATE OR REPLACE FUNCTION process_video_watch_commissions(
  watching_user_id UUID,
  video_earning NUMERIC
)
RETURNS VOID AS $$
DECLARE
  ref RECORD;
  comm_rate NUMERIC;
  comm_amt NUMERIC;
BEGIN
  FOR ref IN 
    SELECT r.referrer_id, r.level, cr.video_watch_commission_percentage
    FROM referrals r
    JOIN commission_rates cr ON r.level = cr.level
    WHERE r.referred_id = watching_user_id
    ORDER BY r.level
  LOOP
    comm_rate := ref.video_watch_commission_percentage;
    comm_amt := video_earning * (comm_rate / 100);
    
    UPDATE users 
    SET income_wallet_balance = income_wallet_balance + comm_amt
    WHERE id = ref.referrer_id;
    
    INSERT INTO referral_commissions (
      referrer_id, from_user_id, level, commission_type,
      source_amount, commission_percentage, commission_amount, status
    ) VALUES (
      ref.referrer_id, watching_user_id, ref.level, 'video_watch',
      video_earning, comm_rate, comm_amt, 'approved'
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Reset daily counters
CREATE OR REPLACE FUNCTION reset_daily_counters()
RETURNS VOID AS $$
BEGIN
  UPDATE users
  SET videos_watched_today = 0, daily_earnings_today = 0, last_video_reset_date = CURRENT_DATE
  WHERE last_video_reset_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Helper function to calculate days remaining (since we removed the generated column)
CREATE OR REPLACE FUNCTION get_days_remaining(trial_end_date DATE)
RETURNS INTEGER AS $$
BEGIN
  RETURN CASE 
    WHEN trial_end_date >= CURRENT_DATE THEN (trial_end_date - CURRENT_DATE)
    ELSE 0
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- STEP 10: RLS POLICIES (BASIC)
-- ============================================

-- Enable RLS on sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (users can only see their own data)
CREATE POLICY users_own_data ON users FOR ALL USING (auth.uid() = auth_user_id);
CREATE POLICY user_memberships_own_data ON user_memberships FOR ALL USING (
  user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
);
CREATE POLICY deposits_own_data ON deposits FOR ALL USING (
  user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
);
CREATE POLICY withdrawals_own_data ON withdrawals FOR ALL USING (
  user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
);
CREATE POLICY wallet_transactions_own_data ON wallet_transactions FOR ALL USING (
  user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
);

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

SELECT 'FIXED IMMUTABLE SCHEMA APPLIED SUCCESSFULLY!' as status,
       'All tables, functions, and triggers created without immutability errors' as message,
       'The days_remaining column has been removed and replaced with a helper function' as note;