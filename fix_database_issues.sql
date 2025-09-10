-- Fix database issues for user authentication
-- Run this in your Supabase SQL editor

-- First, let's check if the users table exists and has the right structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- If the users table doesn't exist or is missing columns, create/update it
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL DEFAULT 'User',
    username VARCHAR(100) UNIQUE NOT NULL DEFAULT 'user',
    phone_number VARCHAR(20),
    profile_avatar VARCHAR(500),
    
    -- VIP & Status Information
    vip_level VARCHAR(10) DEFAULT 'VIP1',
    position_title VARCHAR(100) DEFAULT 'General Employee',
    user_status VARCHAR(20) DEFAULT 'active',
    
    -- Financial Information
    income_wallet_balance NUMERIC(15,2) DEFAULT 0.00,
    personal_wallet_balance NUMERIC(15,2) DEFAULT 0.00,
    total_earnings NUMERIC(15,2) DEFAULT 0.00,
    total_invested NUMERIC(15,2) DEFAULT 0.00,
    
    -- Referral Information
    referral_code VARCHAR(20) UNIQUE NOT NULL DEFAULT UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8)),
    referred_by UUID,
    referral_count INTEGER DEFAULT 0,
    
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

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add referral_count column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'referral_count') THEN
        ALTER TABLE users ADD COLUMN referral_count INTEGER DEFAULT 0;
    END IF;
    
    -- Add position_title column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'position_title') THEN
        ALTER TABLE users ADD COLUMN position_title VARCHAR(100) DEFAULT 'General Employee';
    END IF;
    
    -- Add profile_avatar column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'profile_avatar') THEN
        ALTER TABLE users ADD COLUMN profile_avatar VARCHAR(500);
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by);
CREATE INDEX IF NOT EXISTS idx_users_vip_level ON users(vip_level);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

-- Create RLS policies
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = auth_user_id);

-- Create function to handle new user creation from auth.users
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

-- Create trigger to call the function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Check if there are any existing users without profiles
SELECT 
    au.id as auth_user_id,
    au.email,
    au.phone,
    u.id as user_id
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.auth_user_id
WHERE u.id IS NULL;

-- If there are users without profiles, create them
INSERT INTO public.users (
    auth_user_id,
    full_name,
    username,
    phone_number,
    referral_code,
    user_status
)
SELECT 
    au.id,
    COALESCE(au.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(au.raw_user_meta_data->>'username', 'user_' || substr(au.id::text, 1, 8)),
    COALESCE(au.raw_user_meta_data->>'phone_number', au.phone),
    UPPER(substr(gen_random_uuid()::text, 1, 8)),
    'active'
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.auth_user_id
WHERE u.id IS NULL;

