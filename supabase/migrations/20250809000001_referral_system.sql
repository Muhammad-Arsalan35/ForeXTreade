-- Migration: Referral System Tables
-- Description: Creates tables for tracking referrals and team structure

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
('D', 1.00, 0.25, true);   -- D-Level: 1% VIP upgrade, 0.25% video

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

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_user_id ON referral_commissions(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_from_user_id ON referral_commissions(from_user_id);
CREATE INDEX IF NOT EXISTS idx_team_structure_user_id ON team_structure(user_id);
CREATE INDEX IF NOT EXISTS idx_team_structure_team_member_id ON team_structure(team_member_id);

-- Enable Row Level Security
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_structure ENABLE ROW LEVEL SECURITY;

-- Create policies for referrals table
CREATE POLICY "Users can view their own referrals" 
  ON referrals FOR SELECT 
  USING (auth.uid() IN (
    SELECT auth_user_id FROM users WHERE id = referrer_id OR id = referred_id
  ));

-- Create policies for referral_commissions table
CREATE POLICY "Users can view their own commissions" 
  ON referral_commissions FOR SELECT 
  USING (auth.uid() IN (
    SELECT auth_user_id FROM users WHERE id = user_id
  ));

-- Create policies for commission_rates table
CREATE POLICY "Anyone can view commission rates" 
  ON commission_rates FOR SELECT 
  USING (true);

-- Create policies for team_structure table
CREATE POLICY "Users can view their own team structure" 
  ON team_structure FOR SELECT 
  USING (auth.uid() IN (
    SELECT auth_user_id FROM users WHERE id = user_id
  ));