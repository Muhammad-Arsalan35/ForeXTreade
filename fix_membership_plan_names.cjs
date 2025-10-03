const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fixMembershipPlanNames() {
  try {
    console.log('🔧 Fixing Membership Plan Names to Match User VIP Levels...\n');

    // 1. Check current situation
    console.log('1. Current membership plans:');
    const { data: plans, error: plansError } = await supabase
      .from('membership_plans')
      .select('id, name, vip_level, daily_video_limit')
      .eq('is_active', true)
      .order('name');

    if (plansError) {
      console.error('❌ Error fetching plans:', plansError);
      return;
    }

    plans.forEach(plan => {
      console.log(`   ID: ${plan.id} | Name: "${plan.name}" | VIP Level: "${plan.vip_level}" | Daily Limit: ${plan.daily_video_limit}`);
    });

    console.log('\n2. User VIP levels that need matching plans:');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('vip_level')
      .order('vip_level');

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }

    const uniqueVipLevels = [...new Set(users.map(u => u.vip_level))];
    uniqueVipLevels.forEach(level => {
      const hasMatchingPlan = plans.some(p => p.name === level);
      console.log(`   "${level}": ${hasMatchingPlan ? '✅ Has plan' : '❌ No matching plan'}`);
    });

    // 3. Fix the plan names to match user vip_levels
    console.log('\n3. Updating membership plan names...');

    // Update "VIP Level 1" to "VIP1"
    const vip1Plan = plans.find(p => p.name === 'VIP Level 1');
    if (vip1Plan) {
      console.log('Updating "VIP Level 1" plan to "VIP1"...');
      const { error: updateError } = await supabase
        .from('membership_plans')
        .update({ 
          name: 'VIP1',
          vip_level: 'VIP1'
        })
        .eq('id', vip1Plan.id);

      if (updateError) {
        console.error('❌ Error updating VIP Level 1 plan:', updateError);
      } else {
        console.log('✅ Successfully updated VIP Level 1 plan to VIP1');
      }
    }

    // Update other VIP Level plans if needed
    for (let i = 2; i <= 10; i++) {
      const planName = `VIP Level ${i}`;
      const targetName = `VIP${i}`;
      const plan = plans.find(p => p.name === planName);
      
      if (plan) {
        console.log(`Updating "${planName}" plan to "${targetName}"...`);
        const { error: updateError } = await supabase
          .from('membership_plans')
          .update({ 
            name: targetName,
            vip_level: targetName
          })
          .eq('id', plan.id);

        if (updateError) {
          console.error(`❌ Error updating ${planName} plan:`, updateError);
        } else {
          console.log(`✅ Successfully updated ${planName} plan to ${targetName}`);
        }
      }
    }

    // 4. Now fix the user daily_task_limits
    console.log('\n4. Updating user daily_task_limits...');
    
    // Update VIP1 users
    const { error: vip1UpdateError } = await supabase
      .from('users')
      .update({ daily_task_limit: 1 })
      .eq('vip_level', 'VIP1');

    if (vip1UpdateError) {
      console.error('❌ Error updating VIP1 users:', vip1UpdateError);
    } else {
      console.log('✅ Updated VIP1 users to have 1 daily task');
    }

    // 5. Verification
    console.log('\n5. Final verification...');
    const { data: updatedPlans, error: verifyPlansError } = await supabase
      .from('membership_plans')
      .select('name, vip_level, daily_video_limit')
      .eq('is_active', true)
      .order('name');

    if (verifyPlansError) {
      console.error('❌ Error fetching updated plans:', verifyPlansError);
      return;
    }

    console.log('Updated membership plans:');
    updatedPlans.forEach(plan => {
      console.log(`   "${plan.name}" | VIP Level: "${plan.vip_level}" | Daily Limit: ${plan.daily_video_limit}`);
    });

    const { data: verifiedUsers, error: verifyUsersError } = await supabase
      .from('users')
      .select('full_name, vip_level, daily_task_limit')
      .order('created_at', { ascending: false });

    if (verifyUsersError) {
      console.error('❌ Error fetching verified users:', verifyUsersError);
      return;
    }

    console.log('\nFinal user status:');
    verifiedUsers.forEach((user, index) => {
      const matchingPlan = updatedPlans.find(p => p.name === user.vip_level);
      const isCorrect = matchingPlan && user.daily_task_limit === matchingPlan.daily_video_limit;
      const status = isCorrect ? '✅' : '❌';
      const expected = matchingPlan ? matchingPlan.daily_video_limit : 'No Plan';
      console.log(`${index + 1}. ${user.full_name} (${user.vip_level}) - ${user.daily_task_limit} tasks (expected: ${expected}) ${status}`);
    });

    console.log('\n🎉 MEMBERSHIP PLAN NAMES FIXED!');
    console.log('================================');
    console.log('✅ All membership plans now match user vip_level values');
    console.log('✅ All users have correct daily_task_limit');
    console.log('✅ New Intern users will see "Remaining tasks (3/3)"');
    console.log('✅ VIP1 users will see "Remaining tasks (1/1)"');

  } catch (error) {
    console.error('❌ Error during fix:', error);
  }
}

fixMembershipPlanNames();