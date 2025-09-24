const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function checkTableStructures() {
  console.log('🔍 Checking Table Structures and Missing Elements\n');
  
  try {
    // 1. Check user_profiles table structure
    console.log('1️⃣ Checking user_profiles table structure...');
    const { data: profileSample, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1)
      .single();
    
    if (profileError) {
      console.log('   ❌ Profile structure error:', profileError.message);
    } else {
      console.log('   ✅ user_profiles columns found:');
      Object.keys(profileSample).forEach(key => {
        console.log(`      - ${key}: ${typeof profileSample[key]} (${profileSample[key]})`);
      });
    }
    
    // 2. Check if tasks table exists by trying different approaches
    console.log('\n2️⃣ Checking tasks table existence...');
    
    // Try simple select
    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .select('id')
      .limit(1);
    
    if (tasksError) {
      console.log('   ❌ Tasks table error:', tasksError.message);
      
      // Try to check if it's a different table name
      console.log('   Trying alternative table names...');
      
      const alternativeNames = ['task', 'user_tasks', 'daily_tasks'];
      for (const tableName of alternativeNames) {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (!error) {
          console.log(`   ✅ Found table: ${tableName}`);
          console.log(`   Sample data:`, data[0] || 'No data');
        }
      }
    } else {
      console.log('   ✅ Tasks table accessible');
      console.log('   Sample task:', tasksData[0] || 'No tasks found');
    }
    
    // 3. Check membership_plans table
    console.log('\n3️⃣ Checking membership_plans table...');
    const { data: planSample, error: planError } = await supabase
      .from('membership_plans')
      .select('*')
      .limit(1)
      .single();
    
    if (planError) {
      console.log('   ❌ Membership plans error:', planError.message);
    } else {
      console.log('   ✅ membership_plans columns:');
      Object.keys(planSample).forEach(key => {
        console.log(`      - ${key}: ${planSample[key]}`);
      });
    }
    
    // 4. Check vip_levels table
    console.log('\n4️⃣ Checking vip_levels table...');
    const { data: vipSample, error: vipError } = await supabase
      .from('vip_levels')
      .select('*')
      .limit(1)
      .single();
    
    if (vipError) {
      console.log('   ❌ VIP levels error:', vipError.message);
    } else {
      console.log('   ✅ vip_levels columns:');
      Object.keys(vipSample).forEach(key => {
        console.log(`      - ${key}: ${vipSample[key]}`);
      });
    }
    
    // 5. Try to identify what's missing for user_profiles
    console.log('\n5️⃣ Testing user_profiles insert with minimal data...');
    const testUserId = '8f5d4383-08d8-4ebb-9638-bf70f65e6894';
    
    // Try with just required fields
    const { data: minimalProfile, error: minimalError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: testUserId,
        membership_level: 'trial',
        vip_level: 0,
        trial_tasks_completed: 0
      })
      .select();
    
    if (minimalError) {
      console.log('   ❌ Minimal insert error:', minimalError.message);
    } else {
      console.log('   ✅ Minimal profile created successfully');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

checkTableStructures();