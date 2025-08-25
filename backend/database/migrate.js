import { pool } from './connection.js';
import dotenv from 'dotenv';

dotenv.config();

const createTables = async () => {
  try {
    console.log('🔄 Starting database migration...');

    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone_number VARCHAR(20) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        referral_code VARCHAR(10) UNIQUE NOT NULL,
        position_title VARCHAR(50) DEFAULT 'General Employee',
        vip_level VARCHAR(10) DEFAULT 'VIP1',
        total_earnings DECIMAL(15,2) DEFAULT 0.00,
        total_invested DECIMAL(15,2) DEFAULT 0.00,
        income_wallet_balance DECIMAL(15,2) DEFAULT 0.00,
        personal_wallet_balance DECIMAL(15,2) DEFAULT 0.00,
        profile_avatar VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        is_verified BOOLEAN DEFAULT false,
        reset_token VARCHAR(255),
        reset_token_expiry TIMESTAMP,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Referrals table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS referrals (
        id SERIAL PRIMARY KEY,
        referrer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        referred_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        commission_earned DECIMAL(15,2) DEFAULT 0.00,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(referrer_id, referred_id)
      )
    `);

    // Payment methods table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payment_methods (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(50) NOT NULL,
        account_number VARCHAR(100),
        account_name VARCHAR(100),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Deposits table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS deposits (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        payment_method_id INTEGER REFERENCES payment_methods(id),
        amount DECIMAL(15,2) NOT NULL,
        till_id VARCHAR(100),
        payment_proof VARCHAR(255),
        sender_account_number VARCHAR(100),
        status VARCHAR(20) DEFAULT 'pending',
        admin_notes TEXT,
        approved_by INTEGER REFERENCES users(id),
        approved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Withdrawals table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS withdrawals (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        payment_method_id INTEGER REFERENCES payment_methods(id),
        amount DECIMAL(15,2) NOT NULL,
        account_number VARCHAR(100),
        account_name VARCHAR(100),
        status VARCHAR(20) DEFAULT 'pending',
        admin_notes TEXT,
        approved_by INTEGER REFERENCES users(id),
        approved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tasks table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        duration_seconds INTEGER DEFAULT 10,
        reward_amount DECIMAL(15,2) NOT NULL,
        video_url VARCHAR(500),
        image_url VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Task completions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS task_completions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
        reward_earned DECIMAL(15,2) NOT NULL,
        completion_time INTEGER,
        status VARCHAR(20) DEFAULT 'completed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, task_id, DATE(created_at))
      )
    `);

    // VIP levels table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vip_levels (
        id SERIAL PRIMARY KEY,
        level_name VARCHAR(10) UNIQUE NOT NULL,
        deposit_requirement DECIMAL(15,2) NOT NULL,
        daily_tasks_limit INTEGER NOT NULL,
        earning_range VARCHAR(50) NOT NULL,
        commission_rate DECIMAL(5,2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // User levels table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_levels (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        vip_level_id INTEGER REFERENCES vip_levels(id),
        current_level VARCHAR(10) NOT NULL,
        total_deposits DECIMAL(15,2) DEFAULT 0.00,
        tasks_completed_today INTEGER DEFAULT 0,
        last_task_reset DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Financial records table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS financial_records (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(20) NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        description TEXT,
        reference_id INTEGER,
        reference_type VARCHAR(50),
        balance_before DECIMAL(15,2) NOT NULL,
        balance_after DECIMAL(15,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        type VARCHAR(20) DEFAULT 'notification',
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // System settings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Database tables created successfully!');

    // Insert default data
    await insertDefaultData();

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
};

const insertDefaultData = async () => {
  try {
    console.log('🔄 Inserting default data...');

    // Insert default payment methods
    await pool.query(`
      INSERT INTO payment_methods (name, type, account_number, account_name) VALUES
      ('Easypaisa', 'mobile_money', '03001234567', 'Admin Account'),
      ('JazzCash', 'mobile_money', '03001234568', 'Admin Account')
      ON CONFLICT DO NOTHING
    `);

    // Insert VIP levels
    await pool.query(`
      INSERT INTO vip_levels (level_name, deposit_requirement, daily_tasks_limit, earning_range, commission_rate) VALUES
      ('VIP1', 100.00, 5, '50-80', 5.00),
      ('VIP2', 500.00, 8, '120-200', 7.00),
      ('VIP3', 1000.00, 12, '300-500', 10.00),
      ('VIP4', 2000.00, 15, '600-1000', 12.00),
      ('VIP5', 5000.00, 20, '1500-2500', 15.00),
      ('VIP6', 10000.00, 25, '3000-5000', 18.00),
      ('VIP7', 20000.00, 30, '6000-10000', 20.00),
      ('VIP8', 50000.00, 35, '15000-25000', 25.00),
      ('VIP9', 100000.00, 40, '30000-50000', 30.00),
      ('VIP10', 200000.00, 50, '60000-100000', 35.00)
      ON CONFLICT DO NOTHING
    `);

    // Insert sample tasks
    await pool.query(`
      INSERT INTO tasks (title, description, category, duration_seconds, reward_amount, video_url) VALUES
      ('Watch Product Advertisement', 'Watch this product advertisement video', 'Commercial Advertisement', 5, 80.00, 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4'),
      ('Review Clothing Collection', 'Review our latest clothing collection', 'Commodity Advertising', 10, 120.00, 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4'),
      ('Movie Trailer Preview', 'Watch this movie trailer', 'Film Publicity', 15, 200.00, 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4')
      ON CONFLICT DO NOTHING
    `);

    // Insert system settings
    await pool.query(`
      INSERT INTO system_settings (setting_key, setting_value, description) VALUES
      ('app_name', 'Clover Path Rewards', 'Application name'),
      ('support_email', 'support@cloverpathrewards.com', 'Support email address'),
      ('support_phone', '+923001234567', 'Support phone number'),
      ('min_withdrawal', '100', 'Minimum withdrawal amount'),
      ('max_withdrawal', '50000', 'Maximum withdrawal amount'),
      ('daily_task_limit_reset', '00:00', 'Time when daily task limits reset')
      ON CONFLICT DO NOTHING
    `);

    console.log('✅ Default data inserted successfully!');

  } catch (error) {
    console.error('❌ Default data insertion failed:', error);
    throw error;
  }
};

// Run migration
createTables()
  .then(() => {
    console.log('🎉 Database migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });


