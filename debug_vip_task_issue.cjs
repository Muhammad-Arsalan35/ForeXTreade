const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function debugVipTaskIssue() {
  try {
    console.log('🔍 Debugging VIP Level and Task Limit Issue...\n');

    // 1. Check all users and their VIP levels
    console.log('1. Current Users and VIP Levels:');
    console.log('================================');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, auth_user_id, full_name, vip_level, daily_task_limit, referral_count')
      .order('created_at', { ascending: false })
      .limit(5);

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }

    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.full_name}`);
      console.log(`   VIP Level: ${user.vip_level || 'NULL'}`);
      console.log(`   Daily Task Limit: ${user.daily_task_limit || 'NULL'}`);
      console.log(`   Referral Count: ${user.referral_count || 'NULL'}`);
      console.log('');
    });

    // 2. Check membership plans
    console.log('2. Available Membership Plans:');
    console.log('==============================');
    const { data: plans, error: plansError } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (plansError) {
      console.error('❌ Error fetching plans:', plansError);
    } else {
      plans.forEach(plan => {
        console.log(`${plan.name}:`);
        console.log(`   Daily Video Limit: ${plan.daily_video_limit}`);
        console.log(`   Price: ${plan.price}`);
        console.log(`   VIP Level: ${plan.vip_level || 'Not Set'}`);
        console.log('');
      });
    }

    // 3. Check what the frontend logic would calculate
    console.log('3. Frontend Logic Calculation:');
    console.log('===============================');
    
    const testUser = users[0]; // Get the most recent user
    if (testUser) {
      console.log(`Testing with user: ${testUser.full_name}`);
      console.log(`User's VIP Level: ${testUser.vip_level}`);
      
      // This mimics the logic in useTaskCompletion.ts
      const { data: membershipPlan, error: planError } = await supabase
        .from('membership_plans')
        .select('daily_video_limit')
        .eq('name', testUser.vip_level)
        .single();

      if (planError) {
        console.log(`❌ No membership plan found for VIP level '${testUser.vip_level}'`);
        console.log('Frontend would use default: 5 tasks');
      } else {
        console.log(`✅ Membership plan found: ${membershipPlan.daily_video_limit} tasks`);
      }

      // This mimics the logic in taskCompletionService.ts
      const limits = {
        'VIP1': 5,
        'VIP2': 10,
        'VIP3': 16,
        'VIP4': 31,
        'VIP5': 50,
        'VIP6': 75,
        'VIP7': 100,
        'VIP8': 120,
        'VIP9': 150,
        'VIP10': 180
      };
      
      const serviceLimit = limits[testUser.vip_level] || 5;
      console.log(`TaskCompletionService would calculate: ${serviceLimit} tasks`);

      // This mimics the fallback logic in Task.tsx
      const fallbackLimit = testUser.vip_level === 'Intern' ? 3 :
                           testUser.vip_level === 'VIP1' ? 5 :
                           testUser.vip_level === 'VIP2' ? 10 :
                           testUser.vip_level === 'VIP3' ? 16 :
                           testUser.vip_level === 'VIP4' ? 31 :
                           testUser.vip_level === 'VIP5' ? 50 :
                           testUser.vip_level === 'VIP6' ? 75 :
                           testUser.vip_level === 'VIP7' ? 100 :
                           testUser.vip_level === 'VIP8' ? 120 :
                           testUser.vip_level === 'VIP9' ? 150 :
                           testUser.vip_level === 'VIP10' ? 180 : 5;
      
      console.log(`Task.tsx fallback would calculate: ${fallbackLimit} tasks`);
    }

    // 4. Check if there's an 'Intern' membership plan
    console.log('\n4. Checking for Intern Membership Plan:');
    console.log('=======================================');
    const { data: internPlan, error: internError } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('name', 'Intern')
      .single();

    if (internError) {
      console.log('❌ No "Intern" membership plan found');
      console.log('This explains why users with vip_level="Intern" get default limits');
    } else {
      console.log('✅ Intern plan found:', internPlan);
    }

    // 5. Check the signup trigger function
    console.log('\n5. Checking User Creation Process:');
    console.log('==================================');
    console.log('The issue is likely in the user creation trigger or default VIP assignment.');
    console.log('New users are getting vip_level="Intern" but there\'s no matching membership plan.');
    
    console.log('\n🎯 DIAGNOSIS:');
    console.log('=============');
    console.log('1. New users get vip_level="Intern"');
    console.log('2. There\'s no "Intern" membership plan in the database');
    console.log('3. Frontend falls back to hardcoded limits');
    console.log('4. TaskCompletionService.ts doesn\'t handle "Intern" level');
    console.log('5. This causes inconsistent task limits');

  } catch (error) {
    console.error('❌ Error during debugging:', error);
  }
}

debugVipTaskIssue();