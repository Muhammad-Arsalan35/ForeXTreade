-- ============================================
-- TASKMASTER PLATFORM - FRESH SUPABASE DATABASE
-- Complete Clean Database Structure
-- Commission Rates: A=8%, B=4%, C=2%
-- VIP Duration: 180 days
-- ============================================

-- ============================================
-- STEP 1: CREATE ENUM TYPES
-- ============================================

CREATE TYPE vip_level_enum AS ENUM (
  'Intern', 'VIP1', 'VIP2', 'VIP3', 'VIP4', 
  'VIP5', 'VIP6', 'VIP7', 'VIP8', 'VIP9', 'VIP10'
);

CREATE TYPE referral_level_enum AS ENUM ('A', 'B', 'C');

CREATE TYPE transaction_type_enum AS ENUM (
  'deposit', 'withdrawal', 'vip_purchase', 'task_earning', 
  'referral_commission', 'video_commission', 'admin_adjustment'
);

CREATE TYPE wallet_type_enum AS ENUM ('personal', 'income');

CREATE TYPE transaction_status_enum AS ENUM ('pending', 'approved', 'rejected', 'completed');

CREATE TYPE deposit_status_enum AS ENUM ('pending', 'approved', 'rejected');

CREATE TYPE withdrawal_status_enum AS ENUM ('pending', 'processing', 'completed', 'rejected');

CREATE TYPE task_status_enum AS ENUM ('pending', 'watching', 'completed', 'verified');

-- ============================================
-- STEP 2: CORE USER TABLE
-- ============================================

CREATE TABLE users (
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

-- Indexes
CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_users_referral_code ON users(referral_code);
CREATE INDEX idx_users_referred_by ON users(referred_by);
CREATE INDEX idx_users_vip_level ON users(vip_level);
CREATE INDEX idx_users_trial ON users(trial_end_date) WHERE trial_expired = FALSE;

-- ============================================
-- STEP 3: MEMBERSHIP PLANS
-- ============================================

CREATE TABLE membership_plans (
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

-- Insert Plans (180 days duration)
INSERT INTO membership_plans (name, vip_level, display_order, daily_video_limit, video_rate, price, duration_days, description) VALUES
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
('VIP Level 10', 'VIP10', 10, 10, 8000.00, 2400000.00, 180, 'Ultimate - 10 videos daily');

-- User Active Memberships
CREATE TABLE user_memberships (
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
CREATE UNIQUE INDEX idx_user_memberships_unique_active ON user_memberships(user_id) WHERE is_active = TRUE;
CREATE INDEX idx_user_memberships_active ON user_memberships(user_id, is_active);
CREATE INDEX idx_user_memberships_expires ON user_memberships(expires_at) WHERE is_active = TRUE;

-- ============================================
-- STEP 4: REFERRAL SYSTEM
-- ============================================

-- Commission Rates (CORRECTED: 8%, 4%, 2%)
CREATE TABLE commission_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level referral_level_enum NOT NULL UNIQUE,
  vip_upgrade_commission_percentage NUMERIC(5,2) NOT NULL,
  video_watch_commission_percentage NUMERIC(5,2) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert Corrected Commission Rates
INSERT INTO commission_rates (level, vip_upgrade_commission_percentage, video_watch_commission_percentage) VALUES
('A', 8.00, 3.00),   -- A-Level: 8% on VIP upgrade, 3% on video watch
('B', 4.00, 1.50),   -- B-Level: 4% on VIP upgrade, 1.5% on video watch
('C', 2.00, 0.75);   -- C-Level: 2% on VIP upgrade, 0.75% on video watch

-- Referral Relationships
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  level referral_level_enum NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(referrer_id, referred_id, level)
);

CREATE INDEX idx_referrals_referrer ON referrals(referrer_id, level);
CREATE INDEX idx_referrals_referred ON referrals(referred_id);

-- Referral Commissions
CREATE TABLE referral_commissions (
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

CREATE INDEX idx_ref_commissions_referrer ON referral_commissions(referrer_id, level);
CREATE INDEX idx_ref_commissions_from ON referral_commissions(from_user_id);
CREATE INDEX idx_ref_commissions_type ON referral_commissions(commission_type);

-- ============================================
-- STEP 5: VIDEO & TASKS
-- ============================================

CREATE TABLE videos (
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

CREATE INDEX idx_videos_active ON videos(is_active);

-- Daily Video Tasks
CREATE TABLE daily_video_tasks (
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

CREATE INDEX idx_daily_tasks_user_date ON daily_video_tasks(user_id, task_date);
CREATE INDEX idx_daily_tasks_status ON daily_video_tasks(status);

-- Video Watch History
CREATE TABLE video_watch_history (
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

CREATE INDEX idx_video_history_user ON video_watch_history(user_id, watch_date);

-- ============================================
-- STEP 6: FINANCIAL TRANSACTIONS
-- ============================================

-- Payment Methods
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('jazzcash', 'easypaisa', 'bank_transfer')),
  account_details JSONB,
  instructions TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO payment_methods (name, type, account_details, instructions) VALUES
('JazzCash', 'jazzcash', '{"account_number": "03001234567", "account_name": "TaskMaster Admin"}', 'Send payment and submit transaction ID'),
('EasyPaisa', 'easypaisa', '{"account_number": "03009876543", "account_name": "TaskMaster Admin"}', 'Send payment and submit transaction ID');

-- Deposits
CREATE TABLE deposits (
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

CREATE INDEX idx_deposits_user ON deposits(user_id);
CREATE INDEX idx_deposits_status ON deposits(status);

-- Withdrawals
CREATE TABLE withdrawals (
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

CREATE INDEX idx_withdrawals_user ON withdrawals(user_id);
CREATE INDEX idx_withdrawals_status ON withdrawals(status);

-- Wallet Transaction Ledger
CREATE TABLE wallet_transactions (
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

CREATE INDEX idx_wallet_txn_user ON wallet_transactions(user_id, created_at DESC);
CREATE INDEX idx_wallet_txn_type ON wallet_transactions(transaction_type);

-- ============================================
-- STEP 7: ADMIN & LOGGING
-- ============================================

CREATE TABLE admin_actions (
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

CREATE INDEX idx_admin_actions_admin ON admin_actions(admin_user_id, created_at DESC);

CREATE TABLE user_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL,
  activity_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_activity ON user_activity_log(user_id, created_at DESC);

CREATE TABLE system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  setting_type VARCHAR(20) DEFAULT 'string',
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
('app_name', 'TaskMaster', 'string', 'Application name'),
('withdrawal_fee_percentage', '2', 'number', 'Withdrawal fee (2%)'),
('intern_trial_days', '3', 'number', 'Intern trial period'),
('support_whatsapp', '+92-300-1234567', 'string', 'Support WhatsApp');

-- ============================================
-- STEP 8: FUNCTIONS & TRIGGERS
-- ============================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_timestamp BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_deposits_timestamp BEFORE UPDATE ON deposits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_withdrawals_timestamp BEFORE UPDATE ON withdrawals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

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

CREATE TRIGGER check_vip_before_withdrawal
BEFORE INSERT ON withdrawals
FOR EACH ROW EXECUTE FUNCTION prevent_intern_withdrawal();

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

-- ============================================
-- STEP 9: VIEWS
-- ============================================

CREATE OR REPLACE VIEW user_dashboard_view AS
SELECT 
  u.id, u.full_name, u.username, u.phone_number, u.vip_level,
  u.personal_wallet_balance, u.income_wallet_balance, u.total_earnings,
  u.referral_code, u.can_withdraw, u.trial_end_date, u.trial_expired, u.days_remaining,
  u.videos_watched_today,
  mp.name as plan_name, mp.daily_video_limit, mp.video_rate, mp.daily_earning,
  um.expires_at as plan_expires_at,
  (SELECT COUNT(*) FROM referrals WHERE referrer_id = u.id) as total_referrals,
  (SELECT COUNT(*) FROM referrals WHERE referrer_id = u.id AND level = 'A') as a_level_count,
  (SELECT COUNT(*) FROM referrals WHERE referrer_id = u.id AND level = 'B') as b_level_count,
  (SELECT COUNT(*) FROM referrals WHERE referrer_id = u.id AND level = 'C') as c_level_count,
  (SELECT COALESCE(SUM(commission_amount), 0) FROM referral_commissions WHERE referrer_id = u.id) as total_referral_earnings
FROM users u
LEFT JOIN user_memberships um ON u.id = um.user_id AND um.is_active = TRUE
LEFT JOIN membership_plans mp ON um.plan_id = mp.id;

CREATE OR REPLACE VIEW admin_dashboard_stats AS
SELECT
  (SELECT COUNT(*) FROM users) as total_users,
  (SELECT COUNT(*) FROM users WHERE vip_level != 'Intern') as vip_users,
  (SELECT COUNT(*) FROM deposits WHERE status = 'pending') as pending_deposits,
  (SELECT COUNT(*) FROM withdrawals WHERE status = 'pending') as pending_withdrawals,
  (SELECT COALESCE(SUM(amount), 0) FROM deposits WHERE status = 'pending') as pending_deposit_amount,
  (SELECT COALESCE(SUM(amount), 0) FROM withdrawals WHERE status = 'pending') as pending_withdrawal_amount,
  (SELECT COUNT(*) FROM daily_video_tasks WHERE task_date = CURRENT_DATE AND status = 'completed') as tasks_completed_today,
  (SELECT COALESCE(SUM(earning_amount), 0) FROM daily_video_tasks WHERE task_date = CURRENT_DATE AND status = 'completed') as earnings_today;

-- ============================================
-- STEP 10: ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all user-related tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_video_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_commissions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY users_select_own ON users
  FOR SELECT USING (auth_user_id = auth.uid());

CREATE POLICY users_update_own ON users
  FOR UPDATE USING (auth_user_id = auth.uid());

-- Deposits policies
CREATE POLICY deposits_select_own ON deposits
  FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY deposits_insert_own ON deposits
  FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- Withdrawals policies
CREATE POLICY withdrawals_select_own ON withdrawals
  FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY withdrawals_insert_own ON withdrawals
  FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- Tasks policies
CREATE POLICY tasks_select_own ON daily_video_tasks
  FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY tasks_insert_own ON daily_video_tasks
  FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY tasks_update_own ON daily_video_tasks
  FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- Wallet transactions policies
CREATE POLICY wallet_transactions_select_own ON wallet_transactions
  FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- Referrals policies
CREATE POLICY referrals_select_own ON referrals
  FOR SELECT USING (
    referrer_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()) OR
    referred_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

-- Referral commissions policies
CREATE POLICY referral_commissions_select_own ON referral_commissions
  FOR SELECT USING (referrer_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- ============================================
-- STEP 11: CRITICAL - USER SIGNUP TRIGGER
-- ============================================

-- Function to handle new user creation from auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_username VARCHAR(50);
  counter INTEGER := 1;
  base_username VARCHAR(50);
BEGIN
  -- Generate a unique username from email
  base_username := LOWER(SPLIT_PART(NEW.email, '@', 1));
  new_username := base_username;
  
  -- Ensure username is unique
  WHILE EXISTS (SELECT 1 FROM users WHERE username = new_username) LOOP
    new_username := base_username || counter::text;
    counter := counter + 1;
  END LOOP;
  
  -- Insert into public.users table
  INSERT INTO users (
    auth_user_id,
    full_name,
    username,
    phone_number,
    vip_level,
    trial_start_date,
    trial_end_date,
    trial_expired,
    personal_wallet_balance,
    income_wallet_balance,
    total_earnings,
    total_invested,
    can_withdraw,
    referral_code,
    videos_watched_today,
    last_video_reset_date,
    daily_earnings_today,
    is_active,
    account_status,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    new_username,
    COALESCE(NEW.phone, ''),
    'Intern',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '3 days',
    FALSE,
    0.00,
    0.00,
    0.00,
    0.00,
    FALSE,
    UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8)),
    0,
    CURRENT_DATE,
    0.00,
    TRUE,
    'active',
    NOW(),
    NOW()
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth signup
    RAISE LOG 'Error in handle_new_user trigger: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users for new signups
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- ============================================
-- STEP 12: SAMPLE DATA
-- ============================================

INSERT INTO videos (title, description, video_url, thumbnail_url, duration, category) VALUES
('Product Demo', 'Watch our latest product demonstration', 'https://example.com/video1.mp4', 'https://example.com/thumb1.jpg', 30, 'advertisement'),
('Brand Story', 'Learn about our brand journey', 'https://example.com/video2.mp4', 'https://example.com/thumb2.jpg', 45, 'promotion'),
('Service Intro', 'Discover our services', 'https://example.com/video3.mp4', 'https://example.com/thumb3.jpg', 30, 'service');

-- ============================================
-- COMPLETE - DATABASE READY TO USE
-- ============================================