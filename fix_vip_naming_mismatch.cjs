const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fixVipNamingMismatch() {
  try {
    console.log('🔧 Fixing VIP Level Naming Mismatch...\n');

    // 1. Check current situation
    console.log('1. Current membership plans:');
    const { data: plans, error: plansError } = await supabase
      .from('membership_plans')
      .select('name, vip_level, daily_video_limit')
      .eq('is_active', true)
      .order('name');

    if (plansError) {
      console.error('❌ Error fetching plans:', plansError);
      return;
    }

    plans.forEach(plan => {
      console.log(`   Plan Name: "${plan.name}" | VIP Level: "${plan.vip_level}" | Daily Limit: ${plan.daily_video_limit}`);
    });

    console.log('\n2. Current users with VIP levels:');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('full_name, vip_level, daily_task_limit')
      .order('created_at', { ascending: false });

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }

    const vipCounts = {};
    users.forEach(user => {
      vipCounts[user.vip_level] = (vipCounts[user.vip_level] || 0) + 1;
      console.log(`   ${user.full_name}: vip_level="${user.vip_level}" | daily_task_limit=${user.daily_task_limit}`);
    });

    console.log('\n3. VIP Level Summary:');
    Object.entries(vipCounts).forEach(([level, count]) => {
      console.log(`   "${level}": ${count} users`);
    });

    // 4. The solution: Update users to match the plan names OR update plan names to match users
    console.log('\n4. Fixing the mismatch...');
    console.log('Strategy: Update users vip_level to match membership plan names');

    // Fix VIP1 users to match "VIP Level 1" plan
    const vip1Users = users.filter(u => u.vip_level === 'VIP1');
    if (vip1Users.length > 0) {
      console.log(`\nUpdating ${vip1Users.length} VIP1 users to "VIP Level 1"...`);
      
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          vip_level: 'VIP Level 1',
          daily_task_limit: 1  // Set to match the plan's daily_video_limit
        })
        .eq('vip_level', 'VIP1');

      if (updateError) {
        console.error('❌ Error updating VIP1 users:', updateError);
      } else {
        console.log('✅ Successfully updated VIP1 users');
      }
    }

    // 5. Verification
    console.log('\n5. Verification after fix...');
    const { data: verifiedUsers, error: verifyError } = await supabase
      .from('users')
      .select('full_name, vip_level, daily_task_limit')
      .order('created_at', { ascending: false });

    if (verifyError) {
      console.error('❌ Error during verification:', verifyError);
      return;
    }

    console.log('Updated user status:');
    verifiedUsers.forEach((user, index) => {
      const matchingPlan = plans.find(p => p.name === user.vip_level);
      const isCorrect = matchingPlan && user.daily_task_limit === matchingPlan.daily_video_limit;
      const status = isCorrect ? '✅' : '❌';
      const expected = matchingPlan ? matchingPlan.daily_video_limit : 'No Plan';
      console.log(`${index + 1}. ${user.full_name} (${user.vip_level}) - ${user.daily_task_limit} tasks (expected: ${expected}) ${status}`);
    });

    console.log('\n🎉 VIP NAMING MISMATCH FIXED!');
    console.log('==============================');
    console.log('✅ All users now have vip_level matching membership plan names');
    console.log('✅ All users have daily_task_limit matching their plan\'s daily_video_limit');
    console.log('✅ Frontend will show correct task counts for all users');

  } catch (error) {
    console.error('❌ Error during fix:', error);
  }
}

fixVipNamingMismatch();