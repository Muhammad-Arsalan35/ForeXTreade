-- Migration: Membership Plans Table
-- Description: Creates the membership_plans table with VIP levels 1-10

-- Create membership_plans table if it doesn't exist
CREATE TABLE IF NOT EXISTS membership_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  daily_video_limit INTEGER NOT NULL,
  price NUMERIC(12,2) NOT NULL,
  video_rate NUMERIC(10,2) NOT NULL, -- Rate per video
  duration_days INTEGER NOT NULL DEFAULT 120,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert VIP plans with their respective video limits, prices, and rates
INSERT INTO membership_plans (id, name, daily_video_limit, price, video_rate, duration_days, is_active) VALUES 
(gen_random_uuid(), 'VIP1', 5, 5000, 30, 120, true),
(gen_random_uuid(), 'VIP2', 10, 16000, 50, 120, true),
(gen_random_uuid(), 'VIP3', 16, 36000, 70, 120, true),
(gen_random_uuid(), 'VIP4', 31, 78000, 80, 120, true),
(gen_random_uuid(), 'VIP5', 50, 160000, 100, 120, true),
(gen_random_uuid(), 'VIP6', 75, 260000, 115, 120, true),
(gen_random_uuid(), 'VIP7', 100, 500000, 160, 120, true),
(gen_random_uuid(), 'VIP8', 120, 800000, 220, 120, true),
(gen_random_uuid(), 'VIP9', 150, 1200000, 260, 120, true),
(gen_random_uuid(), 'VIP10', 180, 2400000, 440, 120, true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_membership_plans_name ON membership_plans(name);

-- Enable Row Level Security
ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Policy: Anyone can view membership plans
CREATE POLICY "Anyone can view membership plans" 
  ON membership_plans FOR SELECT 
  USING (true);

-- Policy: Only admins can modify membership plans
CREATE POLICY "Only admins can modify membership plans" 
  ON membership_plans FOR ALL 
  USING (auth.uid() IN (SELECT auth_user_id FROM users WHERE user_status = 'admin'));