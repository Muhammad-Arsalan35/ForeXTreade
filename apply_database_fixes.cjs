const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_KEY is required for this operation');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createMissingTables() {
  console.log('🔧 CREATING MISSING TABLES');
  console.log('===========================\n');

  // Create user_profiles table
  console.log('1. Creating user_profiles table...');
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1);
    
    if (error && error.message.includes('does not exist')) {
      console.log('   ❌ user_profiles table does not exist, needs to be created via SQL');
    } else if (error && error.message.includes('permission denied')) {
      console.log('   ⚠️  user_profiles table exists but has permission issues');
    } else {
      console.log('   ✅ user_profiles table exists and is accessible');
    }
  } catch (err) {
    console.log(`   ❌ Error checking user_profiles: ${err.message}`);
  }

  // Create team_structure table
  console.log('2. Creating team_structure table...');
  try {
    const { data, error } = await supabase
      .from('team_structure')
      .select('id')
      .limit(1);
    
    if (error && error.message.includes('does not exist')) {
      console.log('   ❌ team_structure table does not exist, needs to be created via SQL');
    } else if (error && error.message.includes('permission denied')) {
      console.log('   ⚠️  team_structure table exists but has permission issues');
    } else {
      console.log('   ✅ team_structure table exists and is accessible');
    }
  } catch (err) {
    console.log(`   ❌ Error checking team_structure: ${err.message}`);
  }

  // Check task_completions permissions
  console.log('3. Checking task_completions permissions...');
  try {
    const { data, error } = await supabase
      .from('task_completions')
      .select('id')
      .limit(1);
    
    if (error && error.message.includes('permission denied')) {
      console.log('   ❌ task_completions has permission denied error');
    } else {
      console.log('   ✅ task_completions is accessible');
    }
  } catch (err) {
    console.log(`   ❌ Error checking task_completions: ${err.message}`);
  }

  console.log('\n📋 RECOMMENDATIONS:');
  console.log('1. The missing tables need to be created via Supabase Dashboard SQL Editor');
  console.log('2. RLS policies need to be configured properly');
  console.log('3. Service role permissions need to be granted');
  
  console.log('\n🔗 NEXT STEPS:');
  console.log('1. Go to your Supabase Dashboard');
  console.log('2. Navigate to SQL Editor');
  console.log('3. Run the SQL from fix_missing_tables_and_rls.sql');
  console.log('4. Or run the existing migration files in supabase/migrations/');
  
  // Test what we can access
  console.log('\n🧪 TESTING ACCESSIBLE TABLES...');
  const testTables = ['users', 'membership_plans', 'videos', 'deposits', 'referral_commissions'];
  
  for (const tableName of testTables) {
    try {
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact' })
        .limit(1);
      
      if (error) {
        console.log(`   ❌ ${tableName}: ${error.message}`);
      } else {
        console.log(`   ✅ ${tableName}: Accessible (${count || 0} records)`);
      }
    } catch (error) {
      console.log(`   ❌ ${tableName}: ${error.message}`);
    }
  }
}

createMissingTables().catch(console.error);