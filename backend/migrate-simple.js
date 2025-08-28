import { pool } from './database/connection.js';

const createMissingTables = async () => {
  try {
    console.log('🚀 Starting database migration...');

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

    // 6. Add unit_price column to membership_plans if not exists
    await pool.query(`
      ALTER TABLE membership_plans 
      ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10,2) DEFAULT 0;
    `);
    console.log('✅ Added unit_price to membership_plans table');

    // 7. Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_referrals_parent_user_id ON referrals(parent_user_id);
      CREATE INDEX IF NOT EXISTS idx_referrals_child_user_id ON referrals(child_user_id);
      CREATE INDEX IF NOT EXISTS idx_user_plans_user_id ON user_plans(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_plans_active ON user_plans(is_active);
      CREATE INDEX IF NOT EXISTS idx_video_earnings_user_date ON video_earnings(user_id, video_date);
      CREATE INDEX IF NOT EXISTS idx_referral_commissions_user_id ON referral_commissions(user_id);
      CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
    `);
    console.log('✅ Created performance indexes');

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

// Run migration
runMigration();
