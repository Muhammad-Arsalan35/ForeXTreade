import { pool } from './connection.js';
import dotenv from 'dotenv';

dotenv.config();

const createMissingTables = async () => {
  try {
    console.log('🚀 Starting database migration...');

    // 0. Enable required extensions
    await pool.query(`
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    `);
    console.log('✅ Ensured required extensions');

    // Core tables required by routes
    // users
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        full_name VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        phone_number VARCHAR(30) UNIQUE NOT NULL,
        username VARCHAR(50),
        password_hash TEXT NOT NULL,
        referral_code VARCHAR(20) UNIQUE,
        referred_by UUID REFERENCES users(id) ON DELETE SET NULL,
        position_title VARCHAR(50) DEFAULT 'General Employee',
        vip_level VARCHAR(20) DEFAULT 'VIP1',
        is_active BOOLEAN DEFAULT true,
        profile_avatar TEXT,
        personal_wallet_balance NUMERIC(12,2) DEFAULT 0,
        income_wallet_balance NUMERIC(12,2) DEFAULT 0,
        total_earnings NUMERIC(12,2) DEFAULT 0,
        total_invested NUMERIC(12,2) DEFAULT 0,
        tasks_completed_today INTEGER DEFAULT 0,
        last_task_reset DATE,
        reset_token TEXT,
        reset_token_expiry TIMESTAMP WITH TIME ZONE,
        last_login TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('✅ Created users table');

    // user_profiles
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        full_name VARCHAR(100),
        username VARCHAR(50),
        phone_number VARCHAR(30),
        membership_type VARCHAR(20) DEFAULT 'free' CHECK (membership_type IN ('free','vip')),
        membership_level VARCHAR(50),
        is_trial_active BOOLEAN DEFAULT true,
        trial_start_date DATE,
        trial_end_date DATE,
        total_earnings NUMERIC(12,2) DEFAULT 0,
        videos_watched_today INTEGER DEFAULT 0,
        last_video_reset_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('✅ Created user_profiles table');

    // membership_plans (VIP plans)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS membership_plans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(50) UNIQUE NOT NULL,
        price NUMERIC(12,2) NOT NULL,
        daily_video_limit INTEGER NOT NULL,
        unit_price NUMERIC(12,2) DEFAULT 0,
        duration_days INTEGER NOT NULL DEFAULT 30,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('✅ Created membership_plans table');

    // videos
    await pool.query(`
      CREATE TABLE IF NOT EXISTS videos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(200) NOT NULL,
        description TEXT,
        video_url TEXT NOT NULL,
        thumbnail_url TEXT,
        duration INTEGER DEFAULT 0,
        reward_per_watch NUMERIC(10,2) DEFAULT 0,
        category VARCHAR(50),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('✅ Created videos table');

    // payment_methods
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payment_methods (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(50) NOT NULL,
        account_number VARCHAR(100) NOT NULL,
        logo_url TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('✅ Created payment_methods table');

    // deposits
    await pool.query(`
      CREATE TABLE IF NOT EXISTS deposits (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        payment_method_id UUID NOT NULL REFERENCES payment_methods(id),
        amount NUMERIC(12,2) NOT NULL,
        till_id VARCHAR(100),
        payment_proof TEXT,
        sender_account_number VARCHAR(100),
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
        admin_notes TEXT,
        approved_by UUID REFERENCES users(id),
        approved_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('✅ Created deposits table');

    // withdrawals
    await pool.query(`
      CREATE TABLE IF NOT EXISTS withdrawals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        payment_method_id UUID NOT NULL REFERENCES payment_methods(id),
        amount NUMERIC(12,2) NOT NULL,
        account_number VARCHAR(100) NOT NULL,
        account_name VARCHAR(100) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
        admin_notes TEXT,
        approved_by UUID REFERENCES users(id),
        approved_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('✅ Created withdrawals table');

    // tasks
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(200) NOT NULL,
        description TEXT,
        duration_seconds INTEGER DEFAULT 30,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('✅ Created tasks table');

    // task_completions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS task_completions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        reward_earned NUMERIC(10,2) NOT NULL,
        completion_time INTEGER,
        status VARCHAR(20) DEFAULT 'completed',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('✅ Created task_completions table');

    // 1. Create referrals table for tracking referral relationships
    await pool.query(`
      CREATE TABLE IF NOT EXISTS referrals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        parent_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        child_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        level VARCHAR(1) NOT NULL CHECK (level IN ('A', 'B', 'C', 'D')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(child_user_id)
      );
    `);
    console.log('✅ Created referrals table');

    // 2. Create user_plans table for VIP plan subscriptions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_plans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        plan_id UUID NOT NULL REFERENCES membership_plans(id) ON DELETE CASCADE,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('✅ Created user_plans table');

    // 3. Create video_earnings table for tracking video rewards
    await pool.query(`
      CREATE TABLE IF NOT EXISTS video_earnings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        video_id UUID,
        reward_amount DECIMAL(10,2) NOT NULL,
        video_date DATE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('✅ Created video_earnings table');

    // 4. Create referral_commissions table for tracking referral earnings
    await pool.query(`
      CREATE TABLE IF NOT EXISTS referral_commissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        source_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        commission_type VARCHAR(20) NOT NULL CHECK (commission_type IN ('video', 'deposit', 'withdrawal')),
        commission_percent DECIMAL(5,2) NOT NULL,
        base_amount DECIMAL(10,2) NOT NULL,
        commission_amount DECIMAL(10,2) NOT NULL,
        level VARCHAR(1) NOT NULL CHECK (level IN ('A', 'B', 'C', 'D')),
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        paid_at TIMESTAMP WITH TIME ZONE
      );
    `);
    console.log('✅ Created referral_commissions table');

    // 5. Add missing columns to existing tables
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) UNIQUE,
      ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS trial_start_date DATE,
      ADD COLUMN IF NOT EXISTS trial_end_date DATE;
    `);
    console.log('✅ Added missing columns to users table');

    await pool.query(`
      ALTER TABLE user_profiles 
      ADD COLUMN IF NOT EXISTS membership_type VARCHAR(20) DEFAULT 'free' CHECK (membership_type IN ('free', 'vip')),
      ADD COLUMN IF NOT EXISTS membership_level VARCHAR(20),
      ADD COLUMN IF NOT EXISTS is_trial_active BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS videos_watched_today INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_video_reset_date DATE DEFAULT CURRENT_DATE;
    `);
    console.log('✅ Added missing columns to user_profiles table');

    // 6. Financial records table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS financial_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        amount NUMERIC(12,2) NOT NULL,
        description TEXT,
        reference_id UUID,
        reference_type VARCHAR(50),
        balance_before NUMERIC(12,2) DEFAULT 0,
        balance_after NUMERIC(12,2) DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('✅ Created financial_records table');

    // 7. Invites table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS invites (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        inviter_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        invitee_email VARCHAR(150) NOT NULL,
        invite_code VARCHAR(20) UNIQUE NOT NULL,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','accepted','expired')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        accepted_at TIMESTAMP WITH TIME ZONE
      );
    `);
    console.log('✅ Created invites table');

    // 8. Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_referrals_parent_user_id ON referrals(parent_user_id);
      CREATE INDEX IF NOT EXISTS idx_referrals_child_user_id ON referrals(child_user_id);
      CREATE INDEX IF NOT EXISTS idx_user_plans_user_id ON user_plans(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_plans_active ON user_plans(is_active);
      CREATE INDEX IF NOT EXISTS idx_video_earnings_user_date ON video_earnings(user_id, video_date);
      CREATE INDEX IF NOT EXISTS idx_referral_commissions_user_id ON referral_commissions(user_id);
      CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
      CREATE INDEX IF NOT EXISTS idx_deposits_user_id ON deposits(user_id);
      CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawals(user_id);
      CREATE INDEX IF NOT EXISTS idx_financial_records_user_id ON financial_records(user_id);
    `);
    console.log('✅ Created performance indexes');

    // 8. Create function to generate referral codes
    await pool.query(`
      CREATE OR REPLACE FUNCTION generate_referral_code() 
      RETURNS VARCHAR AS $$
      DECLARE
        code VARCHAR;
        exists BOOLEAN;
      BEGIN
        LOOP
          code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
          SELECT EXISTS(SELECT 1 FROM users WHERE referral_code = code) INTO exists;
          IF NOT exists THEN
            RETURN code;
          END IF;
        END LOOP;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('✅ Created referral code generator function');

    // 9. Create function to get user video limit
    await pool.query(`
      CREATE OR REPLACE FUNCTION get_user_video_limit(user_uuid UUID)
      RETURNS INTEGER AS $$
      DECLARE
        user_profile RECORD;
        user_plan RECORD;
        video_limit INTEGER;
      BEGIN
        -- Get user profile
        SELECT * INTO user_profile FROM user_profiles WHERE user_id = user_uuid;
        
        -- Check if user is on trial
        IF user_profile.is_trial_active AND CURRENT_DATE <= user_profile.trial_end_date THEN
          RETURN 5; -- 5 videos per day during trial
        END IF;
        
        -- Check if user has active VIP plan
        SELECT * INTO user_plan FROM user_plans 
        WHERE user_id = user_uuid AND is_active = true 
        AND CURRENT_DATE BETWEEN start_date AND end_date
        ORDER BY end_date DESC LIMIT 1;
        
        IF user_plan IS NOT NULL THEN
          -- Get plan details
          SELECT daily_video_limit INTO video_limit FROM membership_plans WHERE id = user_plan.plan_id;
          RETURN COALESCE(video_limit, 0);
        END IF;
        
        -- Default: no videos for free users after trial
        RETURN 0;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('✅ Created get_user_video_limit function');

    // 10. Create function to process video watch and pay commissions
    await pool.query(`
      CREATE OR REPLACE FUNCTION process_video_watch(user_uuid UUID, video_uuid UUID, reward_amount DECIMAL)
      RETURNS DECIMAL AS $$
      DECLARE
        user_profile RECORD;
        user_plan RECORD;
        video_limit INTEGER;
        videos_watched INTEGER;
        actual_reward DECIMAL;
        referrer RECORD;
        commission_amount DECIMAL;
      BEGIN
        -- Get user profile and check limits
        SELECT * INTO user_profile FROM user_profiles WHERE user_id = user_uuid;
        
        -- Get today's video limit
        SELECT get_user_video_limit(user_uuid) INTO video_limit;
        
        -- Get videos watched today
        SELECT COALESCE(videos_watched_today, 0) INTO videos_watched 
        FROM user_profiles WHERE user_id = user_uuid;
        
        -- Check if user can watch more videos
        IF videos_watched >= video_limit THEN
          RAISE EXCEPTION 'Daily video limit reached';
        END IF;
        
        -- Check if user is eligible (not on trial or has VIP)
        IF user_profile.is_trial_active AND CURRENT_DATE > user_profile.trial_end_date THEN
          IF user_profile.membership_type != 'vip' THEN
            RAISE EXCEPTION 'Trial expired. Upgrade to VIP to continue watching videos.';
          END IF;
        END IF;
        
        -- Record video earning
        INSERT INTO video_earnings (user_id, video_id, reward_amount, video_date)
        VALUES (user_uuid, video_uuid, reward_amount, CURRENT_DATE);
        
        -- Update videos watched today
        UPDATE user_profiles 
        SET videos_watched_today = videos_watched + 1,
            last_video_reset_date = CURRENT_DATE
        WHERE user_id = user_uuid;
        
        -- Update total earnings
        UPDATE user_profiles 
        SET total_earnings = COALESCE(total_earnings, 0) + reward_amount
        WHERE user_id = user_uuid;
        
        -- Pay referral commission (A-level gets 3%)
        SELECT r.parent_user_id, u.membership_type INTO referrer
        FROM referrals r
        JOIN users u ON r.parent_user_id = u.id
        WHERE r.child_user_id = user_uuid AND r.level = 'A';
        
        IF referrer IS NOT NULL AND referrer.membership_type = 'vip' THEN
          commission_amount := reward_amount * 0.03; -- 3% commission
          
          INSERT INTO referral_commissions (
            user_id, source_user_id, commission_type, commission_percent, 
            base_amount, commission_amount, level, status
          ) VALUES (
            referrer.parent_user_id, user_uuid, 'video', 3.0, 
            reward_amount, commission_amount, 'A', 'pending'
          );
          
          -- Add to referrer's income wallet
          UPDATE users 
          SET income_wallet_balance = COALESCE(income_wallet_balance, 0) + commission_amount
          WHERE id = referrer.parent_user_id;
        END IF;
        
        RETURN reward_amount;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('✅ Created process_video_watch function');

    // 11. Create function to reset daily video counts
    await pool.query(`
      CREATE OR REPLACE FUNCTION reset_daily_video_counts()
      RETURNS VOID AS $$
      BEGIN
        UPDATE user_profiles 
        SET videos_watched_today = 0,
            last_video_reset_date = CURRENT_DATE
        WHERE last_video_reset_date < CURRENT_DATE;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('✅ Created reset_daily_video_counts function');

    // 12. Create trigger to auto-generate referral codes for new users
    await pool.query(`
      CREATE OR REPLACE FUNCTION auto_generate_referral_code()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.referral_code IS NULL THEN
          NEW.referral_code := generate_referral_code();
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    await pool.query(`
      DROP TRIGGER IF EXISTS trigger_auto_generate_referral_code ON users;
      CREATE TRIGGER trigger_auto_generate_referral_code
        BEFORE INSERT ON users
        FOR EACH ROW
        EXECUTE FUNCTION auto_generate_referral_code();
    `);
    console.log('✅ Created auto-referral code trigger');

    console.log('🎉 Database migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
};

const runMigration = async () => {
  try {
    await createMissingTables();
    console.log('✅ All tables and functions created successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration();
}

export { createMissingTables };



