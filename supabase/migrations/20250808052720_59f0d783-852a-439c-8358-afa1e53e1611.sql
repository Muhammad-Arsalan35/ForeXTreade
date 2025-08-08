-- COMPLETE DATABASE SCHEMA FOR TASK MANAGEMENT & VIP SYSTEM APPLICATION
-- Adapted for PostgreSQL/Supabase

-- ============================================================================
-- 1. ENUMS AND TYPES
-- ============================================================================

-- Create custom types for better data consistency
CREATE TYPE vip_level_enum AS ENUM ('VIP1', 'VIP2', 'VIP3', 'VIP4', 'VIP5', 'VIP6', 'VIP7', 'VIP8', 'VIP9', 'VIP10');
CREATE TYPE user_status_enum AS ENUM ('active', 'suspended', 'banned', 'pending_verification');
CREATE TYPE task_category_enum AS ENUM ('Commercial Advertisement', 'Commodity Advertising', 'Film Publicity', 'Social Media', 'Review Task');
CREATE TYPE task_type_enum AS ENUM ('video_watch', 'image_view', 'app_download', 'survey', 'social_action');
CREATE TYPE media_type_enum AS ENUM ('image', 'video', 'url', 'app_link');
CREATE TYPE task_status_enum AS ENUM ('active', 'inactive', 'expired', 'draft');
CREATE TYPE user_task_status_enum AS ENUM ('assigned', 'started', 'in_progress', 'completed', 'failed', 'expired');
CREATE TYPE referral_level_enum AS ENUM ('A', 'B', 'C');
CREATE TYPE referral_status_enum AS ENUM ('pending', 'active', 'expired', 'cancelled');
CREATE TYPE transaction_type_enum AS ENUM ('task_reward', 'referral_commission', 'vip_upgrade', 'deposit', 'withdrawal', 'admin_adjustment', 'security_deposit', 'tax_deduction', 'bonus_reward', 'penalty', 'refund');
CREATE TYPE wallet_type_enum AS ENUM ('income_wallet', 'personal_wallet');
CREATE TYPE transaction_status_enum AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');
CREATE TYPE deposit_status_enum AS ENUM ('initiated', 'pending', 'processing', 'completed', 'failed', 'expired');
CREATE TYPE withdrawal_status_enum AS ENUM ('pending', 'approved', 'processing', 'completed', 'rejected', 'cancelled');
CREATE TYPE payment_method_enum AS ENUM ('bank_transfer', 'easypaisa', 'jazzcash', 'mobile_banking');
CREATE TYPE period_type_enum AS ENUM ('weekly', 'monthly', 'yearly');
CREATE TYPE notification_type_enum AS ENUM ('info', 'success', 'warning', 'error', 'promotion');
CREATE TYPE security_event_enum AS ENUM ('login_success', 'login_failed', 'password_reset', 'account_locked', 'suspicious_activity');
CREATE TYPE severity_enum AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE setting_type_enum AS ENUM ('string', 'number', 'boolean', 'json');

-- ============================================================================
-- 2. USER MANAGEMENT TABLES
-- ============================================================================

-- VIP Levels Configuration (Create first as referenced by users table)
CREATE TABLE vip_levels (
    id SERIAL PRIMARY KEY,
    level_name VARCHAR(10) NOT NULL UNIQUE,
    level_number INTEGER NOT NULL UNIQUE,
    deposit_required DECIMAL(15,2) NOT NULL,
    daily_tasks_available INTEGER NOT NULL,
    earning_potential DECIMAL(15,2) NOT NULL,
    withdrawal_limit DECIMAL(15,2),
    commission_rate DECIMAL(5,2) DEFAULT 0.00,
    special_benefits TEXT,
    color_scheme VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Main Users Table (extends Supabase auth.users)
CREATE TABLE users (
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
    income_wallet_balance DECIMAL(15,2) DEFAULT 0.00,
    personal_wallet_balance DECIMAL(15,2) DEFAULT 0.00,
    total_earnings DECIMAL(15,2) DEFAULT 0.00,
    total_invested DECIMAL(15,2) DEFAULT 0.00,
    
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

-- Create indexes for users table
CREATE INDEX idx_users_auth_user_id ON users(auth_user_id);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_referral_code ON users(referral_code);
CREATE INDEX idx_users_referred_by ON users(referred_by);
CREATE INDEX idx_users_vip_level ON users(vip_level);

-- User Sessions Table
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token VARCHAR(255) UNIQUE NOT NULL,
    device_info TEXT,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_session_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);

-- ============================================================================
-- 3. VIP UPGRADES HISTORY
-- ============================================================================

CREATE TABLE vip_upgrades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    from_level vip_level_enum,
    to_level vip_level_enum NOT NULL,
    upgrade_amount DECIMAL(15,2) NOT NULL,
    upgrade_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status transaction_status_enum DEFAULT 'pending'
);

CREATE INDEX idx_vip_upgrades_user_id ON vip_upgrades(user_id);
CREATE INDEX idx_vip_upgrades_upgrade_date ON vip_upgrades(upgrade_date);

-- ============================================================================
-- 4. TASK MANAGEMENT TABLES
-- ============================================================================

-- Tasks Master Table
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category task_category_enum NOT NULL,
    task_type task_type_enum NOT NULL,
    
    -- Task Requirements
    requirements JSONB,
    duration_seconds INTEGER DEFAULT 0,
    min_watch_time INTEGER DEFAULT 5,
    
    -- Rewards & Restrictions
    base_reward DECIMAL(10,2) NOT NULL,
    vip_multiplier JSONB,
    min_vip_level vip_level_enum DEFAULT 'VIP1',
    max_completions_per_user INTEGER DEFAULT 1,
    daily_completion_limit INTEGER,
    
    -- Media Content
    thumbnail_url VARCHAR(500),
    media_url VARCHAR(500),
    media_type media_type_enum,
    
    -- Task Status & Scheduling
    task_status task_status_enum DEFAULT 'active',
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    total_budget DECIMAL(15,2),
    used_budget DECIMAL(15,2) DEFAULT 0.00,
    
    -- Statistics
    total_views INTEGER DEFAULT 0,
    total_completions INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 0.00,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tasks_category ON tasks(category);
CREATE INDEX idx_tasks_task_status ON tasks(task_status);
CREATE INDEX idx_tasks_min_vip_level ON tasks(min_vip_level);
CREATE INDEX idx_tasks_start_date ON tasks(start_date);
CREATE INDEX idx_tasks_end_date ON tasks(end_date);

-- User Task Assignments
CREATE TABLE user_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    
    -- Progress Tracking
    status user_task_status_enum DEFAULT 'assigned',
    progress_percentage DECIMAL(5,2) DEFAULT 0.00,
    time_spent INTEGER DEFAULT 0,
    
    -- Completion Details
    completion_data JSONB,
    reward_earned DECIMAL(10,2) DEFAULT 0.00,
    bonus_earned DECIMAL(10,2) DEFAULT 0.00,
    
    -- Timestamps
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Verification
    verified BOOLEAN DEFAULT FALSE,
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verification_notes TEXT,
    
    UNIQUE(user_id, task_id)
);

CREATE INDEX idx_user_tasks_user_id ON user_tasks(user_id);
CREATE INDEX idx_user_tasks_task_id ON user_tasks(task_id);
CREATE INDEX idx_user_tasks_status ON user_tasks(status);
CREATE INDEX idx_user_tasks_completed_at ON user_tasks(completed_at);

-- ============================================================================
-- 5. REFERRAL & MLM SYSTEM TABLES
-- ============================================================================

-- Referral Relationships
CREATE TABLE referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referred_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referral_code_used VARCHAR(20) NOT NULL,
    
    -- MLM Level Structure
    level referral_level_enum NOT NULL,
    commission_rate DECIMAL(5,2) NOT NULL,
    
    -- Status & Validation
    status referral_status_enum DEFAULT 'active',
    registration_completed BOOLEAN DEFAULT FALSE,
    validity_status BOOLEAN DEFAULT TRUE,
    
    -- Earnings Tracking
    total_commission_earned DECIMAL(15,2) DEFAULT 0.00,
    last_commission_date TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(referrer_id, referred_id)
);

CREATE INDEX idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX idx_referrals_referred_id ON referrals(referred_id);
CREATE INDEX idx_referrals_level ON referrals(level);
CREATE INDEX idx_referrals_status ON referrals(status);

-- Team Structure (MLM Hierarchy)
CREATE TABLE team_structure (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES users(id) ON DELETE SET NULL,
    level_depth INTEGER DEFAULT 0,
    
    -- Team Statistics
    total_a_team INTEGER DEFAULT 0,
    total_b_team INTEGER DEFAULT 0,
    total_c_team INTEGER DEFAULT 0,
    active_members INTEGER DEFAULT 0,
    
    -- Commission Tracking
    total_team_commission DECIMAL(15,2) DEFAULT 0.00,
    monthly_team_commission DECIMAL(15,2) DEFAULT 0.00,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_team_structure_user_id ON team_structure(user_id);
CREATE INDEX idx_team_structure_parent_id ON team_structure(parent_id);
CREATE INDEX idx_team_structure_level_depth ON team_structure(level_depth);