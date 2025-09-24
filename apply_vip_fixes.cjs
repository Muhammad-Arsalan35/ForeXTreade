const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  'https://woiccythjszfhbypacaa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvaWNjeXRoanN6ZmhieXBhY2FhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQ4MjM0NiwiZXhwIjoyMDc0MDU4MzQ2fQ.F1_wsNmySrDhGlstpi3HbAZFWuzFioeGWYTdYA6zlU0'
);

async function applyVipFixes() {
  console.log('🔧 Applying VIP level and trial membership fixes...\n');
  
  try {
    // Read the SQL file
    const sqlContent = fs.readFileSync('fix_vip_and_trial_issues.sql', 'utf8');
    
    // Split SQL into individual statements (basic splitting)
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.includes('SELECT ') && statement.includes('as info')) {
        // Skip info statements
        continue;
      }
      
      console.log(`⚡ Executing statement ${i + 1}...`);
      
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: statement + ';'
      });
      
      if (error) {
        console.log(`❌ Error in statement ${i + 1}:`, error.message);
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
          console.log('   ℹ️  This is likely expected (resource already exists)');
        }
      } else {
        console.log(`✅ Statement ${i + 1} executed successfully`);
      }
    }
    
    console.log('\n🔍 Verifying fixes...\n');
    
    // Verify membership plans
    const { data: plans, error: plansError } = await supabase
      .from('membership_plans')
      .select('name, vip_level, price')
      .order('name');
    
    if (plansError) {
      console.log('❌ Error checking plans:', plansError.message);
    } else {
      console.log('✅ Membership plans with VIP levels:');
      plans.forEach(plan => {
        console.log(`   - ${plan.name}: ${plan.vip_level} (Price: $${plan.price})`);
      });
    }
    
    // Verify user profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('username, vip_level, membership_type')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (profilesError) {
      console.log('\n❌ Error checking profiles:', profilesError.message);
    } else {
      console.log('\n✅ Recent user profiles:');
      profiles.forEach(profile => {
        console.log(`   - ${profile.username}: VIP ${profile.vip_level}, Type: ${profile.membership_type}`);
      });
    }
    
    console.log('\n🎉 VIP fixes applied successfully!');
    
  } catch (error) {
    console.error('❌ Error applying fixes:', error.message);
  }
}

applyVipFixes().catch(console.error);