import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://npliuqbormakkyggcgtw.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wbGl1cWJvcm1ha2t5Z2djZ3R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1NTgzNTIsImV4cCI6MjA3MDEzNDM1Mn0.-rw3ZEVg3QYrP7DboDpx6KNFlx2jcoamTMvjd22DU2s";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function listAllTables() {
  console.log('🔍 Checking accessible tables in the database...\n');
  
  // List of all possible tables we might encounter
  const allPossibleTables = [
    'users',
    'tasks', 
    'task_completions',
    'transactions',
    'membership_plans',
    'user_plans',
    'team_structure',
    'payment_methods',
    'deposits',
    'withdrawals',
    'referrals',
    'referral_commissions',
    'commission_rates',
    'videos',
    'user_sessions',
    'user_tasks',
    'vip_upgrades',
    'video_earning_rates',
    'app_config',
    // Additional tables that might exist
    'user_profiles',
    'notifications',
    'settings',
    'audit_logs',
    'security_events',
    'wallet_transactions',
    'plans',
    'user_wallets'
  ];

  // Required tables based on our analysis
  const requiredTables = [
    'users',
    'tasks', 
    'task_completions',
    'transactions',
    'membership_plans',
    'user_plans',
    'team_structure',
    'payment_methods',
    'deposits',
    'withdrawals',
    'referrals',
    'referral_commissions',
    'commission_rates',
    'videos',
    'user_sessions',
    'user_tasks',
    'vip_upgrades',
    'video_earning_rates',
    'app_config'
  ];

  const existingTables = [];
  const inaccessibleTables = [];

  console.log('📋 Checking table accessibility...');
  
  for (const tableName of allPossibleTables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (error) {
        if (error.message.includes('does not exist') || error.message.includes('schema cache')) {
          // Table doesn't exist
          continue;
        } else {
          // Table exists but we can't access it (permissions, etc.)
          inaccessibleTables.push(tableName);
        }
      } else {
        // Table exists and is accessible
        existingTables.push(tableName);
      }
    } catch (err) {
      // Table likely doesn't exist
      continue;
    }
  }

  console.log('\n✅ Accessible tables found:');
  existingTables.forEach((table, index) => {
    const isRequired = requiredTables.includes(table);
    const status = isRequired ? '✅ (required)' : '⚠️  (potentially unnecessary)';
    console.log(`  ${index + 1}. ${table} ${status}`);
  });

  if (inaccessibleTables.length > 0) {
    console.log('\n🔒 Tables that exist but are not accessible:');
    inaccessibleTables.forEach((table, index) => {
      console.log(`  ${index + 1}. ${table}`);
    });
  }

  console.log(`\n📊 Summary:`);
  console.log(`  - Accessible tables: ${existingTables.length}`);
  console.log(`  - Inaccessible tables: ${inaccessibleTables.length}`);

  const unnecessaryTables = existingTables.filter(tableName => 
    !requiredTables.includes(tableName)
  );

  if (unnecessaryTables.length > 0) {
    console.log('\n⚠️  Potentially unnecessary accessible tables:');
    unnecessaryTables.forEach(table => {
      console.log(`  - ${table}`);
    });
    console.log('\n💡 Note: Please review these tables carefully before removing them.');
    console.log('   Some may contain important data or be used by other parts of the system.');
  } else {
    console.log('\n✅ No unnecessary tables found among accessible tables.');
  }

  const missingRequiredTables = requiredTables.filter(tableName => 
    !existingTables.includes(tableName)
  );

  if (missingRequiredTables.length > 0) {
    console.log('\n❌ Missing required tables:');
    missingRequiredTables.forEach(table => {
      console.log(`  - ${table}`);
    });
  }
}

listAllTables();