-- ============================================
-- COMPREHENSIVE RLS POLICIES FIX FOR SIGNIN ISSUE
-- ============================================
-- Run this in Supabase SQL Editor

-- First, ensure RLS is enabled on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "users_insert_own" ON users;
DROP POLICY IF EXISTS "users_read_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_service_access" ON users;
DROP POLICY IF EXISTS "membership_plans_public_read" ON membership_plans;
DROP POLICY IF EXISTS "commission_rates_public_read" ON commission_rates;
DROP POLICY IF EXISTS "videos_public_read" ON videos;
DROP POLICY IF EXISTS "payment_methods_public_read" ON payment_methods;
DROP POLICY IF EXISTS "system_settings_public_read" ON system_settings;

-- Create policies for users table with service role access
CREATE POLICY "users_insert_own" ON users
  FOR INSERT WITH CHECK (
    auth_user_id = auth.uid() OR 
    auth.role() = 'service_role'
  );

CREATE POLICY "users_read_own" ON users
  FOR SELECT USING (
    auth_user_id = auth.uid() OR 
    auth.role() = 'service_role'
  );

CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (
    auth_user_id = auth.uid() OR 
    auth.role() = 'service_role'
  );

-- Create policies for public read access with service role access
CREATE POLICY "membership_plans_public_read" ON membership_plans
  FOR SELECT USING (
    is_active = true OR 
    auth.role() = 'service_role'
  );

CREATE POLICY "commission_rates_public_read" ON commission_rates
  FOR SELECT USING (
    is_active = true OR 
    auth.role() = 'service_role'
  );

CREATE POLICY "videos_public_read" ON videos
  FOR SELECT USING (
    is_active = true OR 
    auth.role() = 'service_role'
  );

CREATE POLICY "payment_methods_public_read" ON payment_methods
  FOR SELECT USING (
    is_active = true OR 
    auth.role() = 'service_role'
  );

CREATE POLICY "system_settings_public_read" ON system_settings
  FOR SELECT USING (
    is_active = true OR 
    auth.role() = 'service_role'
  );

-- Create or replace the user profile creation function with all required fields
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (
    auth_user_id,
    full_name,
    username,
    phone_number,
    vip_level,
    trial_start_date,
    trial_end_date,
    wallet_balance,
    total_earnings,
    total_withdrawals,
    pending_withdrawals,
    is_verified,
    referral_code,
    referred_by_id,
    total_referrals,
    join_date,
    commission_earned,
    is_active,
    status
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || SUBSTRING(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'phone_number', '+92300' || FLOOR(RANDOM() * 10000000)::text),
    'Intern',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '3 days',
    0.00,
    0.00,
    0.00,
    0.00,
    false,
    UPPER(SUBSTRING(MD5(NEW.id::text), 1, 8)),
    NULL,
    0,
    CURRENT_DATE,
    0.00,
    true,
    'active'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT SELECT ON auth.users TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.users TO authenticated;
GRANT INSERT ON public.users TO authenticated;
GRANT UPDATE ON public.users TO authenticated;
GRANT SELECT ON public.membership_plans TO authenticated;
GRANT SELECT ON public.commission_rates TO authenticated;
GRANT SELECT ON public.videos TO authenticated;
GRANT SELECT ON public.payment_methods TO authenticated;
GRANT SELECT ON public.system_settings TO authenticated;

-- Grant service role permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Test query to verify setup
SELECT 'Comprehensive RLS policies and trigger setup completed successfully' as status;