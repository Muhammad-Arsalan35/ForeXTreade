const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://woiccythjszfhbypacaa.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvaWNjeXRoanN6ZmhieXBhY2FhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQ4MjM0NiwiZXhwIjoyMDc0MDU4MzQ2fQ.F1_wsNmySrDhGlstpi3HbAZFWuzFioeGWYTdYA6zlU0';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixMembershipPlansRLS() {
  try {
    console.log('🔧 Fixing membership_plans RLS policies...\n');

    // Read the SQL fix file
    const sqlFix = fs.readFileSync('fix_membership_plans_rls.sql', 'utf8');
    
    // Apply the fix
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlFix });
    
    if (error) {
      console.error('❌ Error applying RLS fix:', error);
      
      // Try alternative approach - execute each statement separately
      console.log('🔄 Trying alternative approach...');
      
      // Drop existing policies
      await supabase.rpc('exec_sql', { 
        sql: `DROP POLICY IF EXISTS "Anyone can view membership plans" ON membership_plans;` 
      });
      
      await supabase.rpc('exec_sql', { 
        sql: `DROP POLICY IF EXISTS "membership_plans_public_read" ON membership_plans;` 
      });
      
      await supabase.rpc('exec_sql', { 
        sql: `DROP POLICY IF EXISTS "Service role full access" ON membership_plans;` 
      });
      
      await supabase.rpc('exec_sql', { 
        sql: `DROP POLICY IF EXISTS "Only admins can modify membership plans" ON membership_plans;` 
      });
      
      // Create new policy
      const { error: createError } = await supabase.rpc('exec_sql', { 
        sql: `CREATE POLICY "Public read access to active membership plans" 
              ON membership_plans 
              FOR SELECT 
              USING (is_active = true);` 
      });
      
      if (createError) {
        console.error('❌ Error creating new policy:', createError);
      } else {
        console.log('✅ Successfully created new RLS policy');
      }
      
    } else {
      console.log('✅ RLS fix applied successfully');
    }

    // Test the fix by trying to read membership plans
    console.log('\n🧪 Testing membership plans access...');
    const { data: plansData, error: plansError } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('is_active', true);

    if (plansError) {
      console.error('❌ Still having issues accessing membership plans:', plansError);
    } else {
      console.log(`✅ Successfully retrieved ${plansData?.length || 0} membership plans:`);
      plansData?.forEach((plan, index) => {
        console.log(`  ${index + 1}. ${plan.name} - Rs. ${plan.price} (${plan.daily_video_limit} daily tasks)`);
      });
    }

  } catch (error) {
    console.error('💥 Script error:', error);
  }
}

fixMembershipPlansRLS();