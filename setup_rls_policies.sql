-- ============================================
-- ROW LEVEL SECURITY POLICIES SETUP
-- Enable RLS and create policies for all tables
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_video_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_watch_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USERS TABLE POLICIES
-- ============================================

-- Users can read their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = auth_user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = auth_user_id);

-- Allow user creation during signup
CREATE POLICY "Allow user creation" ON users
  FOR INSERT WITH CHECK (true);

-- Service role can do everything
CREATE POLICY "Service role full access" ON users
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- MEMBERSHIP PLANS POLICIES (PUBLIC READ)
-- ============================================

CREATE POLICY "Anyone can view membership plans" ON membership_plans
  FOR SELECT USING (is_active = true);

CREATE POLICY "Service role full access" ON membership_plans
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- USER MEMBERSHIPS POLICIES
-- ============================================

CREATE POLICY "Users can view own memberships" ON user_memberships
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Service role full access" ON user_memberships
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- COMMISSION RATES POLICIES (PUBLIC READ)
-- ============================================

CREATE POLICY "Anyone can view commission rates" ON commission_rates
  FOR SELECT USING (is_active = true);

CREATE POLICY "Service role full access" ON commission_rates
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- VIDEOS POLICIES (PUBLIC READ)
-- ============================================

CREATE POLICY "Anyone can view active videos" ON videos
  FOR SELECT USING (is_active = true);

CREATE POLICY "Service role full access" ON videos
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- DAILY VIDEO TASKS POLICIES
-- ============================================

CREATE POLICY "Users can view own tasks" ON daily_video_tasks
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Users can create own tasks" ON daily_video_tasks
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Users can update own tasks" ON daily_video_tasks
  FOR UPDATE USING (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Service role full access" ON daily_video_tasks
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- VIDEO WATCH HISTORY POLICIES
-- ============================================

CREATE POLICY "Users can view own watch history" ON video_watch_history
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Users can create own watch history" ON video_watch_history
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Service role full access" ON video_watch_history
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- REFERRALS POLICIES
-- ============================================

CREATE POLICY "Users can view own referrals" ON referrals
  FOR SELECT USING (
    referrer_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()) OR
    referred_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Service role full access" ON referrals
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- REFERRAL COMMISSIONS POLICIES
-- ============================================

CREATE POLICY "Users can view own commissions" ON referral_commissions
  FOR SELECT USING (
    referrer_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Service role full access" ON referral_commissions
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- PAYMENT METHODS POLICIES (PUBLIC READ)
-- ============================================

CREATE POLICY "Anyone can view payment methods" ON payment_methods
  FOR SELECT USING (is_active = true);

CREATE POLICY "Service role full access" ON payment_methods
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- DEPOSITS POLICIES
-- ============================================

CREATE POLICY "Users can view own deposits" ON deposits
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Users can create own deposits" ON deposits
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Service role full access" ON deposits
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- WITHDRAWALS POLICIES
-- ============================================

CREATE POLICY "Users can view own withdrawals" ON withdrawals
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Users can create own withdrawals" ON withdrawals
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Service role full access" ON withdrawals
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- WALLET TRANSACTIONS POLICIES
-- ============================================

CREATE POLICY "Users can view own wallet transactions" ON wallet_transactions
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Service role full access" ON wallet_transactions
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- SYSTEM SETTINGS POLICIES (PUBLIC READ)
-- ============================================

CREATE POLICY "Anyone can view active settings" ON system_settings
  FOR SELECT USING (is_active = true);

CREATE POLICY "Service role full access" ON system_settings
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- ADMIN POLICIES
-- ============================================

CREATE POLICY "Service role full access" ON admin_actions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can view own activity" ON user_activity_log
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Service role full access" ON user_activity_log
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- VERIFICATION MESSAGE
-- ============================================

SELECT 'RLS policies have been successfully applied to all tables!' as status;