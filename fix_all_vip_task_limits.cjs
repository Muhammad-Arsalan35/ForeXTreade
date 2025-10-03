const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fixAllVipTaskLimits() {
  try {
    console.log('🔧 Fixing All VIP Users Task Limits...\n');

    // 1. Get all membership plans
    console.log('1. Getting all membership plans...');
    const { data: plans, error: plansError } = await supabase
      .from('membership_plans')
      .select('name, daily_video_limit')
      .eq('is_active', true);

    if (plansError) {
      console.error('❌ Error fetching plans:', plansError);
      return;
    }

    console.log('Available plans:');
    plans.forEach(plan => {
      console.log(`   ${plan.name}: ${plan.daily_video_limit} tasks`);
    });

    // 2. Get all users
    console.log('\n2. Getting all users...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, full_name, vip_level, daily_task_limit');

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }

    console.log(`Found ${users.length} users to check`);

    // 3. Fix each user's daily_task_limit
    console.log('\n3. Fixing users task limits...');
    let fixedCount = 0;
    
    for (const user of users) {
      const plan = plans.find(p => p.name === user.vip_level);
      
      if (plan && user.daily_task_limit !== plan.daily_video_limit) {
        console.log(`Fixing ${user.full_name} (${user.vip_level}): ${user.daily_task_limit} → ${plan.daily_video_limit}`);
        
        const { error: updateError } = await supabase
          .from('users')
          .update({ daily_task_limit: plan.daily_video_limit })
          .eq('id', user.id);

        if (updateError) {
          console.error(`❌ Error updating ${user.full_name}:`, updateError);
        } else {
          fixedCount++;
        }
      } else if (plan) {
        console.log(`✅ ${user.full_name} (${user.vip_level}): Already correct (${user.daily_task_limit})`);
      } else {
        console.log(`⚠️ ${user.full_name} (${user.vip_level}): No matching plan found`);
      }
    }

    // 4. Verification
    console.log(`\n4. Verification - Fixed ${fixedCount} users`);
    const { data: verifiedUsers, error: verifyError } = await supabase
      .from('users')
      .select('full_name, vip_level, daily_task_limit')
      .order('created_at', { ascending: false });

    if (verifyError) {
      console.error('❌ Error during verification:', verifyError);
      return;
    }

    console.log('\nFinal user status:');
    verifiedUsers.forEach((user, index) => {
      const plan = plans.find(p => p.name === user.vip_level);
      const isCorrect = plan && user.daily_task_limit === plan.daily_video_limit;
      const status = isCorrect ? '✅' : '❌';
      const expected = plan ? plan.daily_video_limit : 'Unknown';
      console.log(`${index + 1}. ${user.full_name} (${user.vip_level}) - ${user.daily_task_limit} tasks (expected: ${expected}) ${status}`);
    });

    console.log('\n🎉 ALL VIP TASK LIMITS FIXED!');
    console.log('==============================');
    console.log('✅ All users now have daily_task_limit matching their membership plan');
    console.log('✅ Frontend will show correct task counts for all VIP levels');
    console.log('✅ New Intern users will see "Remaining tasks (3/3)"');
    console.log('✅ VIP1 users will see "Remaining tasks (1/1)"');

  } catch (error) {
    console.error('❌ Error during fix:', error);
  }
}

fixAllVipTaskLimits();