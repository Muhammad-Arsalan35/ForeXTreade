const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

console.log('🔍 COMPREHENSIVE DATA FETCH DIAGNOSTICS');
console.log('=======================================\n');

async function diagnoseFetchIssues() {
  // 1. Environment Check
  console.log('1️⃣ Environment Configuration Check...');
  console.log(`   SUPABASE_URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`);
  console.log(`   SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✅ Set' : '❌ Missing'}`);
  console.log(`   SUPABASE_SERVICE_KEY: ${supabaseServiceKey ? '✅ Set' : '❌ Missing'}\n`);

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Critical environment variables missing!');
    return;
  }

  // 2. Supabase Connection Test
  console.log('2️⃣ Supabase Connection Test...');
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('   ✅ Supabase client created successfully');

    // Test basic connectivity
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError && authError.message !== 'Auth session missing!') {
      console.log(`   ⚠️ Auth check warning: ${authError.message}`);
    } else {
      console.log('   ✅ Auth endpoint accessible');
    }
  } catch (error) {
    console.error(`   ❌ Supabase connection failed: ${error.message}`);
    return;
  }

  // 3. Database Table Accessibility Test
  console.log('\n3️⃣ Database Table Accessibility Test...');
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  const tables = [
    'users',
    'user_profiles', 
    'membership_plans',
    'videos',
    'task_completions',
    'deposits',
    'referral_commissions',
    'team_structure'
  ];

  const tableResults = {};
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`   ❌ ${table}: ${error.message}`);
        tableResults[table] = { accessible: false, error: error.message };
      } else {
        console.log(`   ✅ ${table}: Accessible (${data?.length || 0} records)`);
        tableResults[table] = { accessible: true, recordCount: data?.length || 0 };
      }
    } catch (error) {
      console.log(`   ❌ ${table}: ${error.message}`);
      tableResults[table] = { accessible: false, error: error.message };
    }
  }

  // 4. Critical Data Fetch Operations Test
  console.log('\n4️⃣ Critical Data Fetch Operations Test...');
  
  // Test membership plans fetch (used in Dashboard and Task components)
  console.log('   Testing membership plans fetch...');
  try {
    const { data: plansData, error: plansError } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });
    
    if (plansError) {
      console.log(`   ❌ Membership plans fetch failed: ${plansError.message}`);
    } else {
      console.log(`   ✅ Membership plans fetch successful (${plansData?.length || 0} plans)`);
      if (plansData && plansData.length > 0) {
        console.log(`   📊 Sample plan: ${plansData[0].name} - ${plansData[0].price} PKR`);
      }
    }
  } catch (error) {
    console.log(`   ❌ Membership plans fetch error: ${error.message}`);
  }

  // Test videos fetch (used in Task component)
  console.log('   Testing videos fetch...');
  try {
    const { data: videosData, error: videosError } = await supabase
      .from('videos')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (videosError) {
      console.log(`   ❌ Videos fetch failed: ${videosError.message}`);
    } else {
      console.log(`   ✅ Videos fetch successful (${videosData?.length || 0} videos)`);
      if (videosData && videosData.length > 0) {
        console.log(`   📊 Sample video: ${videosData[0].title}`);
      }
    }
  } catch (error) {
    console.log(`   ❌ Videos fetch error: ${error.message}`);
  }

  // 5. Authentication-dependent Operations Test
  console.log('\n5️⃣ Authentication-dependent Operations Test...');
  console.log('   Note: These tests require a logged-in user, so they may show "no user" results');
  
  // Test user profile fetch pattern (used across multiple components)
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      console.log(`   ✅ User authenticated: ${user.email}`);
      
      // Test users table fetch
      const { data: dbUser, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', user.id)
        .single();
      
      if (userError) {
        console.log(`   ❌ User profile fetch failed: ${userError.message}`);
      } else {
        console.log(`   ✅ User profile fetch successful: ${dbUser.username}`);
      }
    } else {
      console.log('   ℹ️ No authenticated user (this is normal for testing)');
    }
  } catch (error) {
    console.log(`   ❌ Auth-dependent test error: ${error.message}`);
  }

  // 6. RLS Policy Check
  console.log('\n6️⃣ RLS Policy Status Check...');
  if (supabaseServiceKey) {
    try {
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
      
      // Check RLS status for critical tables
      const { data: rlsData, error: rlsError } = await supabaseAdmin
        .rpc('sql', {
          query: `
            SELECT 
              schemaname,
              tablename,
              rowsecurity as rls_enabled
            FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename IN ('users', 'user_profiles', 'membership_plans', 'videos', 'task_completions')
            ORDER BY tablename;
          `
        });
      
      if (rlsError) {
        console.log(`   ❌ RLS check failed: ${rlsError.message}`);
      } else {
        console.log('   📋 RLS Status:');
        rlsData?.forEach(table => {
          console.log(`      ${table.tablename}: ${table.rls_enabled ? '🔒 ENABLED' : '🔓 DISABLED'}`);
        });
      }
    } catch (error) {
      console.log(`   ❌ RLS check error: ${error.message}`);
    }
  } else {
    console.log('   ⚠️ Service key not available, skipping RLS check');
  }

  // 7. Network Connectivity Test
  console.log('\n7️⃣ Network Connectivity Test...');
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    });
    
    console.log(`   ✅ REST API endpoint accessible (Status: ${response.status})`);
  } catch (error) {
    console.log(`   ❌ Network connectivity issue: ${error.message}`);
  }

  // 8. Summary and Recommendations
  console.log('\n8️⃣ SUMMARY AND RECOMMENDATIONS');
  console.log('================================');
  
  const inaccessibleTables = Object.entries(tableResults)
    .filter(([_, result]) => !result.accessible)
    .map(([table, _]) => table);
  
  if (inaccessibleTables.length === 0) {
    console.log('✅ All critical tables are accessible');
  } else {
    console.log('❌ Issues found with the following tables:');
    inaccessibleTables.forEach(table => {
      console.log(`   - ${table}: ${tableResults[table].error}`);
    });
  }

  console.log('\n🔧 RECOMMENDED ACTIONS:');
  if (inaccessibleTables.length > 0) {
    console.log('1. Check RLS policies for inaccessible tables');
    console.log('2. Verify table permissions and authentication requirements');
    console.log('3. Review error messages for specific policy violations');
  }
  
  console.log('4. Check browser console for additional client-side errors');
  console.log('5. Verify environment variables in both .env and production');
  console.log('6. Test with authenticated user session for complete diagnosis');
  
  console.log('\n🎯 NEXT STEPS:');
  console.log('1. Run this script with an authenticated user session');
  console.log('2. Check browser network tab for failed requests');
  console.log('3. Review component error handling and fallback mechanisms');
}

diagnoseFetchIssues().catch(console.error);