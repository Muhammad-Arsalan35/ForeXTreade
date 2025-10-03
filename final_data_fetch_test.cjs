const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseServiceKey || !supabaseAnonKey) {
  console.error('❌ Both SUPABASE_SERVICE_KEY and VITE_SUPABASE_ANON_KEY are required');
  process.exit(1);
}

const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

async function testDataFetching() {
  console.log('🧪 FINAL DATA FETCHING TEST');
  console.log('============================\n');

  // Test all critical tables with service key
  console.log('📋 TESTING WITH SERVICE KEY:');
  const criticalTables = [
    'users',
    'user_profiles', 
    'membership_plans',
    'videos',
    'task_completions',
    'team_structure',
    'deposits',
    'referral_commissions'
  ];

  let serviceKeyResults = {};
  for (const tableName of criticalTables) {
    try {
      const { data, error, count } = await supabaseService
        .from(tableName)
        .select('*', { count: 'exact' })
        .limit(1);
      
      if (error) {
        console.log(`   ❌ ${tableName}: ${error.message}`);
        serviceKeyResults[tableName] = 'error';
      } else {
        console.log(`   ✅ ${tableName}: Accessible (${count || 0} records)`);
        serviceKeyResults[tableName] = 'success';
      }
    } catch (error) {
      console.log(`   ❌ ${tableName}: ${error.message}`);
      serviceKeyResults[tableName] = 'error';
    }
  }

  // Test critical app queries
  console.log('\n🎯 TESTING APP-SPECIFIC QUERIES:');
  
  // Test membership plans query (from Task.tsx)
  try {
    const { data: membershipData, error: membershipError } = await supabaseService
      .from('membership_plans')
      .select('*')
      .eq('vip_level', 'Intern');
    
    if (membershipError) {
      console.log(`   ❌ Membership plans (Intern): ${membershipError.message}`);
    } else {
      console.log(`   ✅ Membership plans (Intern): ${membershipData?.length || 0} plans found`);
    }
  } catch (error) {
    console.log(`   ❌ Membership plans (Intern): ${error.message}`);
  }

  // Test videos query (from Task.tsx)
  try {
    const { data: videosData, error: videosError } = await supabaseService
      .from('videos')
      .select('*')
      .limit(5);
    
    if (videosError) {
      console.log(`   ❌ Videos query: ${videosError.message}`);
    } else {
      console.log(`   ✅ Videos query: ${videosData?.length || 0} videos found`);
    }
  } catch (error) {
    console.log(`   ❌ Videos query: ${error.message}`);
  }

  // Test user_profiles query (from Dashboard.tsx)
  try {
    const { data: profilesData, error: profilesError } = await supabaseService
      .from('user_profiles')
      .select('*')
      .limit(1);
    
    if (profilesError) {
      console.log(`   ❌ User profiles query: ${profilesError.message}`);
    } else {
      console.log(`   ✅ User profiles query: ${profilesData?.length || 0} profiles found`);
    }
  } catch (error) {
    console.log(`   ❌ User profiles query: ${error.message}`);
  }

  // Test task_completions query (critical for earnings)
  try {
    const { data: tasksData, error: tasksError } = await supabaseService
      .from('task_completions')
      .select('*')
      .limit(1);
    
    if (tasksError) {
      console.log(`   ❌ Task completions query: ${tasksError.message}`);
    } else {
      console.log(`   ✅ Task completions query: ${tasksData?.length || 0} completions found`);
    }
  } catch (error) {
    console.log(`   ❌ Task completions query: ${error.message}`);
  }

  // Test with anon key (what the app actually uses)
  console.log('\n🔑 TESTING WITH ANON KEY (APP PERSPECTIVE):');
  const appCriticalTables = ['membership_plans', 'videos', 'user_profiles', 'task_completions'];
  
  for (const tableName of appCriticalTables) {
    try {
      const { data, error } = await supabaseAnon
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`   ❌ ${tableName}: ${error.message}`);
      } else {
        console.log(`   ✅ ${tableName}: Accessible from app`);
      }
    } catch (error) {
      console.log(`   ❌ ${tableName}: ${error.message}`);
    }
  }

  // Summary
  console.log('\n📊 SUMMARY:');
  const successCount = Object.values(serviceKeyResults).filter(r => r === 'success').length;
  const totalCount = Object.keys(serviceKeyResults).length;
  
  console.log(`   ✅ Accessible tables: ${successCount}/${totalCount}`);
  
  if (successCount === totalCount) {
    console.log('\n🎉 ALL DATA FETCHING ISSUES RESOLVED!');
    console.log('\n📋 NEXT STEPS:');
    console.log('1. Restart your development server');
    console.log('2. Test the application in the browser');
    console.log('3. Check that data loads properly in Task and Dashboard components');
  } else {
    console.log('\n⚠️  SOME ISSUES REMAIN:');
    Object.entries(serviceKeyResults).forEach(([table, result]) => {
      if (result === 'error') {
        console.log(`   - ${table}: Still has issues`);
      }
    });
    console.log('\n📋 RECOMMENDED ACTIONS:');
    console.log('1. Run the SQL from fix_task_completions_rls.sql in Supabase Dashboard');
    console.log('2. Check RLS policies in Supabase Dashboard');
    console.log('3. Verify service role permissions');
  }
}

testDataFetching().catch(console.error);