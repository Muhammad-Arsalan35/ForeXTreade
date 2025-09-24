import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://npliuqbormakkyggcgtw.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wbGl1cWJvcm1ha2t5Z2djZ3R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1NTgzNTIsImV4cCI6MjA3MDEzNDM1Mn0.-rw3ZEVg3QYrP7DboDpx6KNFlx2jcoamTMvjd22DU2s";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function checkDatabaseSchema() {
  console.log('🔍 Checking database connection and schema...\n');
  
  // List of tables that the application uses
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

  console.log('📋 Required tables based on application code:');
  requiredTables.forEach(table => console.log(`  - ${table}`));
  console.log('');

  // Check each table
  const existingTables = [];
  const missingTables = [];

  for (const table of requiredTables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
        missingTables.push(table);
      } else {
        console.log(`✅ ${table}: exists`);
        existingTables.push(table);
      }
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}`);
      missingTables.push(table);
    }
  }

  console.log('\n📊 Summary:');
  console.log(`✅ Existing tables: ${existingTables.length}`);
  console.log(`❌ Missing tables: ${missingTables.length}`);
  
  if (missingTables.length > 0) {
    console.log('\n🚨 Missing tables that need to be created:');
    missingTables.forEach(table => console.log(`  - ${table}`));
  }

  if (existingTables.length > 0) {
    console.log('\n✅ Existing tables:');
    existingTables.forEach(table => console.log(`  - ${table}`));
  }
}

checkDatabaseSchema().catch(console.error);