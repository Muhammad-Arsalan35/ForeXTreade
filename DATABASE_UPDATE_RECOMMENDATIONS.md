# Database Update Recommendations for ForeXTreade Application

## 📊 **Current Database Analysis Summary**

Based on the complete application flow documentation and existing database schema analysis, here are the comprehensive recommendations for database updates, creates, inserts, and deletes.

---

## 🔴 **CRITICAL UPDATES REQUIRED**

### 1. **MEMBERSHIP PLANS TABLE - MAJOR UPDATES NEEDED**

**Current Issues:**
- Missing **Intern** level (3-day trial)
- Incorrect pricing structure
- Missing minimum withdrawal amounts
- Missing validity periods

**Required SQL Updates:**

```sql
-- 1. ADD INTERN PLAN (Missing completely)
INSERT INTO membership_plans (id, name, daily_video_limit, price, video_rate, duration_days, is_active) VALUES 
(gen_random_uuid(), 'Intern', 3, 0, 10, 3, true);

-- 2. UPDATE EXISTING VIP PLANS WITH CORRECT PRICING
UPDATE membership_plans SET price = 5000, video_rate = 30, duration_days = 120 WHERE name = 'VIP1';
UPDATE membership_plans SET price = 16000, video_rate = 50, duration_days = 120 WHERE name = 'VIP2';
UPDATE membership_plans SET price = 36000, video_rate = 70, duration_days = 120 WHERE name = 'VIP3';
UPDATE membership_plans SET price = 78000, video_rate = 80, duration_days = 120 WHERE name = 'VIP4';
UPDATE membership_plans SET price = 160000, video_rate = 100, duration_days = 120 WHERE name = 'VIP5';
UPDATE membership_plans SET price = 260000, video_rate = 115, duration_days = 120 WHERE name = 'VIP6';
UPDATE membership_plans SET price = 500000, video_rate = 160, duration_days = 120 WHERE name = 'VIP7';
UPDATE membership_plans SET price = 800000, video_rate = 220, duration_days = 120 WHERE name = 'VIP8';
UPDATE membership_plans SET price = 1200000, video_rate = 260, duration_days = 120 WHERE name = 'VIP9';
UPDATE membership_plans SET price = 2400000, video_rate = 440, duration_days = 120 WHERE name = 'VIP10';

-- 3. ADD MISSING COLUMNS TO MEMBERSHIP_PLANS
ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS min_withdrawal_amount NUMERIC(12,2) DEFAULT 0;
ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS validity_type VARCHAR(20) DEFAULT 'days';

-- 4. UPDATE MINIMUM WITHDRAWAL AMOUNTS
UPDATE membership_plans SET min_withdrawal_amount = 0 WHERE name = 'Intern';
UPDATE membership_plans SET min_withdrawal_amount = 30 WHERE name IN ('VIP1', 'VIP2', 'VIP3', 'VIP4', 'VIP5', 'VIP6', 'VIP7', 'VIP8', 'VIP9', 'VIP10');
```

---

### 2. **USER PROFILES TABLE - CRITICAL UPDATES**

**Missing Fields for 3-Day Intern Limitation:**

```sql
-- ADD INTERN TRIAL TRACKING COLUMNS
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS intern_trial_start_date DATE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS intern_trial_end_date DATE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS intern_trial_expired BOOLEAN DEFAULT false;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS days_remaining INTEGER DEFAULT 3;

-- UPDATE DEFAULT MEMBERSHIP TYPE
ALTER TABLE user_profiles ALTER COLUMN membership_type SET DEFAULT 'intern';

-- ADD CONSTRAINT FOR MEMBERSHIP TYPE
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_membership_type_check;
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_membership_type_check 
CHECK (membership_type IN ('intern', 'vip'));
```

---

### 3. **REFERRAL COMMISSION RATES - UPDATES REQUIRED**

**Current vs Required Commission Rates:**

```sql
-- UPDATE COMMISSION RATES TO MATCH APPLICATION FLOW
UPDATE commission_rates SET 
  vip_upgrade_commission_percentage = 10.00, 
  video_commission_percentage = 3.00 
WHERE level = 'A';

UPDATE commission_rates SET 
  vip_upgrade_commission_percentage = 5.00, 
  video_commission_percentage = 2.00 
WHERE level = 'B';

UPDATE commission_rates SET 
  vip_upgrade_commission_percentage = 2.00, 
  video_commission_percentage = 0.75 
WHERE level = 'C';

UPDATE commission_rates SET 
  vip_upgrade_commission_percentage = 1.00, 
  video_commission_percentage = 0.25 
WHERE level = 'D';
```

---

## 🟡 **MEDIUM PRIORITY UPDATES**

### 4. **WITHDRAWAL SYSTEM ENHANCEMENTS**

```sql
-- ADD WITHDRAWAL VALIDATION FIELDS
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS minimum_balance_check BOOLEAN DEFAULT true;
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS vip_level_requirement VARCHAR(10);
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS processing_fee NUMERIC(10,2) DEFAULT 0;
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS final_amount NUMERIC(12,2);

-- ADD WITHDRAWAL LIMITS TABLE
CREATE TABLE IF NOT EXISTS withdrawal_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vip_level VARCHAR(10) NOT NULL,
  min_amount NUMERIC(12,2) NOT NULL,
  max_daily_amount NUMERIC(12,2),
  max_monthly_amount NUMERIC(12,2),
  processing_fee_percentage NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- INSERT WITHDRAWAL LIMITS
INSERT INTO withdrawal_limits (vip_level, min_amount, max_daily_amount, max_monthly_amount) VALUES
('VIP1', 30, 50000, 500000),
('VIP2', 30, 100000, 1000000),
('VIP3', 30, 200000, 2000000),
('VIP4', 30, 500000, 5000000),
('VIP5', 30, 1000000, 10000000),
('VIP6', 30, 2000000, 20000000),
('VIP7', 30, 5000000, 50000000),
('VIP8', 30, 10000000, 100000000),
('VIP9', 30, 20000000, 200000000),
('VIP10', 30, 50000000, 500000000);
```

---

### 5. **FINANCIAL MANAGEMENT ENHANCEMENTS**

```sql
-- ADD WALLET TRANSACTION TRACKING
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_wallet wallet_type_enum,
  to_wallet wallet_type_enum,
  amount NUMERIC(12,2) NOT NULL,
  transaction_type VARCHAR(50) NOT NULL,
  description TEXT,
  reference_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ADD DAILY EARNING LIMITS
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS daily_earning_limit NUMERIC(12,2);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS daily_earnings_today NUMERIC(12,2) DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_earning_reset_date DATE DEFAULT CURRENT_DATE;
```

---

## 🟢 **RECOMMENDED ADDITIONS**

### 6. **ADMIN PANEL FUNCTIONALITY**

```sql
-- CREATE ADMIN ACTIONS LOG
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CREATE SYSTEM MONITORING TABLE
CREATE TABLE IF NOT EXISTS system_monitoring (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name VARCHAR(100) NOT NULL,
  metric_value NUMERIC(15,2),
  metric_data JSONB,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### 7. **USER ACTIVITY TRACKING**

```sql
-- ADD USER ACTIVITY TRACKING
CREATE TABLE IF NOT EXISTS user_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL,
  activity_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ADD INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_user_activity_log_user_id ON user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_activity_type ON user_activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_created_at ON user_activity_log(created_at);
```

---

## 🔴 **DATA INSERTS REQUIRED**

### 8. **ESSENTIAL DATA POPULATION**

```sql
-- INSERT INTERN PLAN DATA
INSERT INTO membership_plans (name, daily_video_limit, price, video_rate, duration_days, min_withdrawal_amount, is_active) 
VALUES ('Intern', 3, 0, 10, 3, 0, true)
ON CONFLICT (name) DO NOTHING;

-- INSERT SYSTEM SETTINGS
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  setting_type VARCHAR(20) DEFAULT 'string',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
('intern_trial_days', '3', 'number', 'Number of days for intern trial period'),
('min_withdrawal_amount', '30', 'number', 'Minimum withdrawal amount for VIP users'),
('withdrawal_processing_fee', '0', 'number', 'Withdrawal processing fee percentage'),
('daily_video_reset_time', '00:00', 'string', 'Time when daily video counts reset'),
('referral_levels', '4', 'number', 'Number of referral levels (A, B, C, D)');
```

---

## ❌ **RECOMMENDED DELETIONS**

### 9. **CLEANUP UNNECESSARY DATA**

```sql
-- REMOVE OUTDATED OR INCORRECT DATA
DELETE FROM membership_plans WHERE name NOT IN ('Intern', 'VIP1', 'VIP2', 'VIP3', 'VIP4', 'VIP5', 'VIP6', 'VIP7', 'VIP8', 'VIP9', 'VIP10');

-- REMOVE INACTIVE COMMISSION RATES
DELETE FROM commission_rates WHERE is_active = false;

-- CLEANUP EXPIRED USER SESSIONS
DELETE FROM user_sessions WHERE expires_at < NOW();
```

---

## 📋 **IMPLEMENTATION PRIORITY**

### **PHASE 1 (CRITICAL - Implement Immediately):**
1. ✅ Add Intern membership plan
2. ✅ Update VIP plan pricing and video rates
3. ✅ Add 3-day trial tracking to user_profiles
4. ✅ Update referral commission rates

### **PHASE 2 (HIGH PRIORITY - Within 1 Week):**
1. ✅ Implement withdrawal validation system
2. ✅ Add wallet transaction tracking
3. ✅ Create withdrawal limits table

### **PHASE 3 (MEDIUM PRIORITY - Within 2 Weeks):**
1. ✅ Add admin panel functionality
2. ✅ Implement user activity tracking
3. ✅ Add system monitoring

---

## 🚨 **CRITICAL WARNINGS**

1. **Data Backup Required**: Before implementing any updates, create a full database backup
2. **Test Environment**: Test all changes in a staging environment first
3. **User Impact**: Some changes may affect existing user data - plan migration carefully
4. **Referral System**: Commission rate changes will affect existing referral earnings
5. **Intern Trial**: Existing users may need manual migration to new trial system

---

## 📊 **VERIFICATION CHECKLIST**

After implementing updates, verify:
- [ ] Intern users can only access videos for 3 days
- [ ] VIP pricing matches documentation
- [ ] Withdrawal minimums are enforced
- [ ] Commission rates are correctly applied
- [ ] Wallet transactions are properly tracked
- [ ] Admin panel has full functionality

---

**Total Estimated Implementation Time: 2-3 weeks**
**Database Changes Required: ~50 SQL statements**
**New Tables: 6**
**Modified Tables: 8**
**Data Migrations: 3**