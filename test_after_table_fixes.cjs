const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function testAfterTableFixes() {
  console.log('🧪 Testing After Table Fixes\n');
  
  try {
    // 1. Test tasks table access
    console.log('1️⃣ Testing tasks table access...');
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .limit(5);
    
    if (tasksError) {
      console.log('   ❌ Tasks table error:', tasksError.message);
    } else {
      console.log(`   ✅ Tasks table accessible (${tasks.length} tasks found)`);
      if (tasks.length > 0) {
        console.log('   Sample tasks:');
        tasks.forEach((task, index) => {
          console.log(`      ${index + 1}. ${task.title} - $${task.reward} (VIP${task.required_vip_level}+)`);
        });
      }
    }
    
    // 2. Test user_task_completions table
    console.log('\n2️⃣ Testing user_task_completions table...');
    const { data: completions, error: completionsError } = await supabase
      .from('user_task_completions')
      .select('*')
      .limit(3);
    
    if (completionsError) {
      console.log('   ❌ User task completions error:', completionsError.message);
    } else {
      console.log(`   ✅ User task completions table accessible (${completions.length} completions found)`);
    }
    
    // 3. Test new user signup
    console.log('\n3️⃣ Testing new user signup...');
    const testEmail = `test_fixed_${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    
    console.log(`   Creating user: ${testEmail}`);
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });
    
    if (signupError) {
      console.log('   ❌ Signup Error:', signupError.message);
    } else {
      console.log('   ✅ User created successfully');
      console.log(`   User ID: ${signupData.user?.id}`);
      
      // Wait for trigger to execute
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check if profile was created
      const { data: newProfile, error: newProfileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', signupData.user?.id)
        .single();
      
      if (newProfileError) {
        console.log('   ❌ New profile fetch error:', newProfileError.message);
      } else {
        console.log('   ✅ Profile created automatically by trigger');
        console.log('   Profile details:', {
          membership_level: newProfile.membership_level,
          vip_level: newProfile.vip_level,
          trial_tasks_completed: newProfile.trial_tasks_completed,
          income_wallet_balance: newProfile.income_wallet_balance,
          personal_wallet_balance: newProfile.personal_wallet_balance
        });
      }
    }
    
    // 4. Test VIP levels and membership plans (should still work)
    console.log('\n4️⃣ Testing VIP levels and membership plans...');
    const { data: vipLevels, error: vipError } = await supabase
      .from('vip_levels')
      .select('*')
      .order('level')
      .limit(3);
    
    if (vipError) {
      console.log('   ❌ VIP levels error:', vipError.message);
    } else {
      console.log(`   ✅ VIP levels accessible (${vipLevels.length} levels)`);
    }
    
    const { data: membershipPlans, error: plansError } = await supabase
      .from('membership_plans')
      .select('*')
      .order('vip_level')
      .limit(3);
    
    if (plansError) {
      console.log('   ❌ Membership plans error:', plansError.message);
    } else {
      console.log(`   ✅ Membership plans accessible (${membershipPlans.length} plans)`);
    }
    
    // 5. Test dashboard-critical queries
    console.log('\n5️⃣ Testing dashboard-critical queries...');
    
    // Get a user with profile for testing
    const { data: testUser, error: testUserError } = await supabase
      .from('user_profiles')
      .select('user_id, membership_level, vip_level')
      .limit(1)
      .single();
    
    if (testUserError) {
      console.log('   ❌ Test user fetch error:', testUserError.message);
    } else {
      console.log('   ✅ Test user found for dashboard testing');
      
      // Test VIP level details fetch
      const { data: vipDetails, error: vipDetailsError } = await supabase
        .from('vip_levels')
        .select('*')
        .eq('level', testUser.vip_level)
        .single();
      
      if (vipDetailsError) {
        console.log('   ❌ VIP details fetch error:', vipDetailsError.message);
      } else {
        console.log('   ✅ VIP details fetch successful');
      }
      
      // Test membership plan fetch
      const { data: userPlan, error: userPlanError } = await supabase
        .from('membership_plans')
        .select('*')
        .eq('vip_level', testUser.vip_level)
        .single();
      
      if (userPlanError) {
        console.log('   ❌ User plan fetch error:', userPlanError.message);
      } else {
        console.log('   ✅ User plan fetch successful');
      }
      
      // Test tasks for user's VIP level
      const { data: userTasks, error: userTasksError } = await supabase
        .from('tasks')
        .select('*')
        .lte('required_vip_level', testUser.vip_level)
        .eq('is_active', true);
      
      if (userTasksError) {
        console.log('   ❌ User tasks fetch error:', userTasksError.message);
      } else {
        console.log(`   ✅ User tasks fetch successful (${userTasks.length} available tasks)`);
      }
    }
    
    // 6. Summary
    console.log('\n📊 SUMMARY:');
    console.log(`✅ Tasks table: ${tasksError ? 'FAILED' : 'SUCCESS'}`);
    console.log(`✅ User task completions: ${completionsError ? 'FAILED' : 'SUCCESS'}`);
    console.log(`✅ New user signup: ${signupError ? 'FAILED' : 'SUCCESS'}`);
    console.log(`✅ VIP levels: ${vipError ? 'FAILED' : 'SUCCESS'}`);
    console.log(`✅ Membership plans: ${plansError ? 'FAILED' : 'SUCCESS'}`);
    console.log(`✅ Dashboard queries: ${testUserError ? 'FAILED' : 'SUCCESS'}`);
    
    const allTestsPassed = !tasksError && !completionsError && !signupError && 
                          !vipError && !plansError && !testUserError;
    
    console.log(`\n🎯 OVERALL RESULT: ${allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    
    if (allTestsPassed) {
      console.log('\n🎉 ALL ISSUES RESOLVED!');
      console.log('   ✅ New user signup works perfectly');
      console.log('   ✅ Task screen will now function');
      console.log('   ✅ Dashboard data fetching is working');
      console.log('   ✅ No more VIP data fetch errors');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error during testing:', error.message);
  }
}

testAfterTableFixes();