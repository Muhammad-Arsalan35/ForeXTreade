-- ============================================
-- FIX MEMBERSHIP PLANS RLS POLICIES
-- ============================================

-- Drop all existing policies for membership_plans
DROP POLICY IF EXISTS "Anyone can view membership plans" ON membership_plans;
DROP POLICY IF EXISTS "membership_plans_public_read" ON membership_plans;
DROP POLICY IF EXISTS "Service role full access" ON membership_plans;
DROP POLICY IF EXISTS "Only admins can modify membership plans" ON membership_plans;

-- Create a simple policy that allows anyone to read active membership plans
CREATE POLICY "Public read access to active membership plans" 
  ON membership_plans 
  FOR SELECT 
  USING (is_active = true);

-- Allow service role to do everything (for admin operations)
CREATE POLICY "Service role full access to membership plans" 
  ON membership_plans 
  FOR ALL 
  USING (auth.role() = 'service_role');

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'membership_plans';