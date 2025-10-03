const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_KEY is required for this check');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDatabaseStructure() {
  console.log('🔍 DATABASE STRUCTURE CHECK');
  console.log('===========================\n');

  // List of expected tables
  const expectedTables = [
    'users',
    'user_profiles', 
    'membership_plans',
    'videos',
    'task_completions',
    'deposits',
    'referral_commissions',
    'team_structure'
  ];

  console.log('1️⃣ Testing table accessibility...');
  
  const tableResults = {};
  
  for (const tableName of expectedTables) {
    try {
      console.log(`   Testing ${tableName}...`);
      
      // Try to query the table
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact' })
        .limit(1);
      
      if (error) {
        tableResults[tableName] = {
          exists: false,
          error: error.message,
          accessible: false
        };
        console.log(`   ❌ ${tableName}: ${error.message}`);
      } else {
        tableResults[tableName] = {
          exists: true,
          accessible: true,
          recordCount: count,
          sampleData: data?.length > 0
        };
        console.log(`   ✅ ${tableName}: Accessible (${count || 0} total records)`);
      }
    } catch (error) {
      tableResults[tableName] = {
        exists: false,
        error: error.message,
        accessible: false
      };
      console.log(`   ❌ ${tableName}: ${error.message}`);
    }
  }

  console.log('\n2️⃣ Testing specific queries that the app uses...');
  
  // Test membership plans query (critical for the app)
  try {
    console.log('   Testing membership_plans with vip_level query...');
    const { data: membershipData, error: membershipError } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('vip_level', 'Intern');
    
    if (membershipError) {
      console.log(`   ❌ membership_plans query failed: ${membershipError.message}`);
    } else {
      console.log(`   ✅ membership_plans query successful (${membershipData?.length || 0} Intern plans found)`);
    }
  } catch (error) {
    console.log(`   ❌ membership_plans query error: ${error.message}`);
  }

  // Test videos query
  try {
    console.log('   Testing videos query...');
    const { data: videosData, error: videosError } = await supabase
      .from('videos')
      .select('*')
      .limit(1);
    
    if (videosError) {
      console.log(`   ❌ videos query failed: ${videosError.message}`);
    } else {
      console.log(`   ✅ videos query successful (${videosData?.length || 0} videos found)`);
    }
  } catch (error) {
    console.log(`   ❌ videos query error: ${error.message}`);
  }

  // Test users query
  try {
    console.log('   Testing users query...');
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, vip_level')
      .limit(1);
    
    if (usersError) {
      console.log(`   ❌ users query failed: ${usersError.message}`);
    } else {
      console.log(`   ✅ users query successful (${usersData?.length || 0} users found)`);
    }
  } catch (error) {
    console.log(`   ❌ users query error: ${error.message}`);
  }

  console.log('\n3️⃣ SUMMARY AND RECOMMENDATIONS');
  console.log('================================');
  
  const accessibleTables = Object.entries(tableResults)
    .filter(([_, result]) => result.accessible)
    .map(([name, _]) => name);
  
  const inaccessibleTables = Object.entries(tableResults)
    .filter(([_, result]) => !result.accessible)
    .map(([name, result]) => ({ name, error: result.error }));

  console.log(`✅ Accessible tables (${accessibleTables.length}): ${accessibleTables.join(', ')}`);
  
  if (inaccessibleTables.length > 0) {
    console.log(`❌ Inaccessible tables (${inaccessibleTables.length}):`);
    inaccessibleTables.forEach(({ name, error }) => {
      console.log(`   - ${name}: ${error}`);
    });
  }

  console.log('\n🔧 RECOMMENDED ACTIONS:');
  
  if (inaccessibleTables.length > 0) {
    console.log('1. Check RLS policies in Supabase dashboard');
    console.log('2. Ensure service key has proper permissions');
    console.log('3. Verify table names and schema');
    console.log('4. Check if tables need to be created');
  } else {
    console.log('✅ All tables are accessible - the issue might be with client-side authentication');
  }

  return { accessibleTables, inaccessibleTables, tableResults };
}

checkDatabaseStructure().catch(console.error);