const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function testCompleteUserExperience() {
  console.log('🧪 Testing Complete User Experience After VIP Fixes\n');
  
  try {
    // 1. Test New User Signup Process
    console.log('1️⃣ Testing New User Signup Process...');
    const testEmail = `test_user_${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    
    console.log(`   Creating user: ${testEmail}`);
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });
    
    if (signupError) {
      console.log('   ❌ Signup Error:', signupError.message);
      return;
    }
    
    console.log('   ✅ User created successfully');
    console.log(`   User ID: ${signupData.user?.id}`);
    
    // Wait a moment for trigger to execute
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 2. Check if user profile was created automatically
    console.log('\n2️⃣ Checking User Profile Creation...');
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', signupData.user?.id)
      .single();
    
    if (profileError) {
      console.log('   ❌ Profile fetch error:', profileError.message);
    } else {
      console.log('   ✅ User profile created successfully');
      console.log('   Profile data:', {
        membership_level: profileData.membership_level,
        vip_level: profileData.vip_level,
        trial_tasks_completed: profileData.trial_tasks_completed,
        balance: profileData.balance
      });
    }
    
    // 3. Test VIP Levels Table Access
    console.log('\n3️⃣ Testing VIP Levels Table Access...');
    const { data: vipLevels, error: vipError } = await supabase
      .from('vip_levels')
      .select('*')
      .order('level');
    
    if (vipError) {
      console.log('   ❌ VIP levels fetch error:', vipError.message);
    } else {
      console.log(`   ✅ VIP levels fetched successfully (${vipLevels.length} levels)`);
      console.log('   Available levels:', vipLevels.map(v => `VIP${v.level}`).join(', '));
    }
    
    // 4. Test Membership Plans Access
    console.log('\n4️⃣ Testing Membership Plans Access...');
    const { data: membershipPlans, error: plansError } = await supabase
      .from('membership_plans')
      .select('*')
      .order('vip_level');
    
    if (plansError) {
      console.log('   ❌ Membership plans fetch error:', plansError.message);
    } else {
      console.log(`   ✅ Membership plans fetched successfully (${membershipPlans.length} plans)`);
      console.log('   Plans available:', membershipPlans.map(p => `VIP${p.vip_level} - $${p.price}`).join(', '));
    }
    
    // 5. Test Task System Access
    console.log('\n5️⃣ Testing Task System Access...');
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .limit(5);
    
    if (tasksError) {
      console.log('   ❌ Tasks fetch error:', tasksError.message);
    } else {
      console.log(`   ✅ Tasks fetched successfully (${tasks.length} tasks found)`);
      if (tasks.length > 0) {
        console.log('   Sample task:', {
          title: tasks[0].title,
          reward: tasks[0].reward,
          type: tasks[0].type
        });
      }
    }
    
    // 6. Test User-Profile Join (Critical for Dashboard)
    console.log('\n6️⃣ Testing User-Profile Join (Dashboard Critical)...');
    const { data: joinData, error: joinError } = await supabase
      .from('user_profiles')
      .select(`
        *,
        auth.users!inner(email)
      `)
      .eq('user_id', signupData.user?.id)
      .single();
    
    if (joinError) {
      console.log('   ❌ User-profile join error:', joinError.message);
    } else {
      console.log('   ✅ User-profile join successful');
      console.log('   Join data:', {
        email: joinData.auth?.users?.email || 'N/A',
        membership_level: joinData.membership_level,
        vip_level: joinData.vip_level
      });
    }
    
    // 7. Test VIP Level Details Fetch
    console.log('\n7️⃣ Testing VIP Level Details Fetch...');
    const userVipLevel = profileData?.vip_level || 0;
    const { data: vipDetails, error: vipDetailsError } = await supabase
      .from('vip_levels')
      .select('*')
      .eq('level', userVipLevel)
      .single();
    
    if (vipDetailsError) {
      console.log('   ❌ VIP details fetch error:', vipDetailsError.message);
    } else {
      console.log('   ✅ VIP details fetched successfully');
      console.log('   VIP details:', {
        level: vipDetails.level,
        name: vipDetails.name,
        daily_tasks: vipDetails.daily_tasks,
        withdrawal_limit: vipDetails.withdrawal_limit
      });
    }
    
    // 8. Test Membership Plan for User's VIP Level
    console.log('\n8️⃣ Testing Membership Plan for User VIP Level...');
    const { data: userPlan, error: userPlanError } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('vip_level', userVipLevel)
      .single();
    
    if (userPlanError) {
      console.log('   ❌ User plan fetch error:', userPlanError.message);
    } else {
      console.log('   ✅ User plan fetched successfully');
      console.log('   Plan details:', {
        name: userPlan.name,
        price: userPlan.price,
        vip_level: userPlan.vip_level
      });
    }
    
    // 9. Summary
    console.log('\n📊 SUMMARY:');
    console.log('✅ New user signup: SUCCESS');
    console.log(`✅ User profile creation: ${profileError ? 'FAILED' : 'SUCCESS'}`);
    console.log(`✅ VIP levels access: ${vipError ? 'FAILED' : 'SUCCESS'}`);
    console.log(`✅ Membership plans access: ${plansError ? 'FAILED' : 'SUCCESS'}`);
    console.log(`✅ Tasks access: ${tasksError ? 'FAILED' : 'SUCCESS'}`);
    console.log(`✅ User-profile join: ${joinError ? 'FAILED' : 'SUCCESS'}`);
    console.log(`✅ VIP details fetch: ${vipDetailsError ? 'FAILED' : 'SUCCESS'}`);
    console.log(`✅ User plan fetch: ${userPlanError ? 'FAILED' : 'SUCCESS'}`);
    
    const allTestsPassed = !signupError && !profileError && !vipError && !plansError && 
                          !tasksError && !joinError && !vipDetailsError && !userPlanError;
    
    console.log(`\n🎯 OVERALL RESULT: ${allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    
    if (allTestsPassed) {
      console.log('\n🎉 The VIP data fetch error is COMPLETELY RESOLVED!');
      console.log('   New users can now signup without any data fetching issues.');
      console.log('   Dashboard and task screen should work perfectly.');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error during testing:', error.message);
  }
}

// Run the test
testCompleteUserExperience();