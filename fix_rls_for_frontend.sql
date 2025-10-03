-- ============================================
-- FIX RLS POLICIES FOR FRONTEND ACCESS
-- ============================================

-- Allow public read access to membership plans
DROP POLICY IF EXISTS "membership_plans_public_read" ON membership_plans;
CREATE POLICY "membership_plans_public_read" ON membership_plans
  FOR SELECT USING (is_active = true);

-- Allow public read access to commission rates
DROP POLICY IF EXISTS "commission_rates_public_read" ON commission_rates;
CREATE POLICY "commission_rates_public_read" ON commission_rates
  FOR SELECT USING (is_active = true);

-- Allow public read access to videos
DROP POLICY IF EXISTS "videos_public_read" ON videos;
CREATE POLICY "videos_public_read" ON videos
  FOR SELECT USING (is_active = true);

-- Allow public read access to payment methods
DROP POLICY IF EXISTS "payment_methods_public_read" ON payment_methods;
CREATE POLICY "payment_methods_public_read" ON payment_methods
  FOR SELECT USING (is_active = true);

-- Allow public read access to system settings
DROP POLICY IF EXISTS "system_settings_public_read" ON system_settings;
CREATE POLICY "system_settings_public_read" ON system_settings
  FOR SELECT USING (is_active = true);

-- Allow authenticated users to insert their own profile
DROP POLICY IF EXISTS "users_insert_own" ON users;
CREATE POLICY "users_insert_own" ON users
  FOR INSERT WITH CHECK (auth_user_id = auth.uid());

-- Allow authenticated users to read their own profile
DROP POLICY IF EXISTS "users_read_own" ON users;
CREATE POLICY "users_read_own" ON users
  FOR SELECT USING (auth_user_id = auth.uid());

-- Allow authenticated users to update their own profile
DROP POLICY IF EXISTS "users_update_own" ON users;
CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth_user_id = auth.uid());

-- Create a function to handle user profile creation on signup
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
    trial_end_date
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || SUBSTRING(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'phone_number', '+92300' || FLOOR(RANDOM() * 10000000)::text),
    'Intern',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '3 days'
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

SELECT 'RLS policies updated for frontend access' as status;