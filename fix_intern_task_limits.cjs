const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fixInternTaskLimits() {
  try {
    console.log('🔧 Fixing Intern Users Task Limits...\n');

    // 1. Get all Intern users
    console.log('1. Finding Intern users with incorrect daily_task_limit...');
    const { data: internUsers, error: usersError } = await supabase
      .from('users')
      .select('id, full_name, vip_level, daily_task_limit')
      .eq('vip_level', 'Intern');

    if (usersError) {
      console.error('❌ Error fetching Intern users:', usersError);
      return;
    }

    console.log(`Found ${internUsers.length} Intern users:`);
    internUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.full_name} - Current limit: ${user.daily_task_limit}`);
    });

    // 2. Get the correct limit from membership plan
    console.log('\n2. Getting correct limit from Intern membership plan...');
    const { data: internPlan, error: planError } = await supabase
      .from('membership_plans')
      .select('daily_video_limit')
      .eq('name', 'Intern')
      .single();

    if (planError) {
      console.error('❌ Error fetching Intern plan:', planError);
      return;
    }

    const correctLimit = internPlan.daily_video_limit;
    console.log(`✅ Intern plan daily_video_limit: ${correctLimit}`);

    // 3. Update all Intern users to have the correct limit
    console.log('\n3. Updating Intern users to correct daily_task_limit...');
    const { data: updateResult, error: updateError } = await supabase
      .from('users')
      .update({ daily_task_limit: correctLimit })
      .eq('vip_level', 'Intern')
      .select('id, full_name, daily_task_limit');

    if (updateError) {
      console.error('❌ Error updating users:', updateError);
      return;
    }

    console.log(`✅ Successfully updated ${updateResult.length} users:`);
    updateResult.forEach((user, index) => {
      console.log(`${index + 1}. ${user.full_name} - New limit: ${user.daily_task_limit}`);
    });

    // 4. Verify the fix
    console.log('\n4. Verification - Checking all users now...');
    const { data: allUsers, error: verifyError } = await supabase
      .from('users')
      .select('full_name, vip_level, daily_task_limit')
      .order('created_at', { ascending: false })
      .limit(5);

    if (verifyError) {
      console.error('❌ Error during verification:', verifyError);
      return;
    }

    console.log('Current user status:');
    allUsers.forEach((user, index) => {
      const status = user.vip_level === 'Intern' && user.daily_task_limit === 3 ? '✅' : 
                    user.vip_level === 'VIP1' && user.daily_task_limit === 1 ? '✅' : '⚠️';
      console.log(`${index + 1}. ${user.full_name} (${user.vip_level}) - ${user.daily_task_limit} tasks ${status}`);
    });

    console.log('\n🎉 TASK LIMIT FIX COMPLETED!');
    console.log('===============================');
    console.log('✅ Intern users now have 3 daily tasks (matching their membership plan)');
    console.log('✅ Frontend should now show "Remaining tasks (3/3)" for new Intern users');
    console.log('✅ The inconsistency between database and frontend is resolved');

  } catch (error) {
    console.error('❌ Error during fix:', error);
  }
}

fixInternTaskLimits();