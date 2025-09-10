-- Create missing tables for commission system

-- Create commission_rates table
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

-- Create referral_commissions table
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

-- Insert default commission rates if they don't exist
INSERT INTO commission_rates (level, vip_upgrade_commission_percentage, video_commission_percentage, is_active) 
SELECT 'A', 10.00, 3.00, true
WHERE NOT EXISTS (SELECT 1 FROM commission_rates WHERE level = 'A');

INSERT INTO commission_rates (level, vip_upgrade_commission_percentage, video_commission_percentage, is_active) 
SELECT 'B', 5.00, 1.50, true
WHERE NOT EXISTS (SELECT 1 FROM commission_rates WHERE level = 'B');

INSERT INTO commission_rates (level, vip_upgrade_commission_percentage, video_commission_percentage, is_active) 
SELECT 'C', 2.00, 0.75, true
WHERE NOT EXISTS (SELECT 1 FROM commission_rates WHERE level = 'C');

INSERT INTO commission_rates (level, vip_upgrade_commission_percentage, video_commission_percentage, is_active) 
SELECT 'D', 1.00, 0.25, true
WHERE NOT EXISTS (SELECT 1 FROM commission_rates WHERE level = 'D');