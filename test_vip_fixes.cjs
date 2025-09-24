const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function testVipFixes() {
  console.log('🧪 Testing VIP Data Fixes...\n');

  try {
    // 1. Test VIP levels table
    console.log('1. Testing VIP levels table...');
    const { data: vipLevels, error: vipError } = await supabase
      .from('vip_levels')
      .select('*')
      .order('level');

    if (vipError) {
      console.error('❌ VIP levels table error:', vipError.message);
    } else {
      console.log(`✅ VIP levels table working: ${vipLevels.length} levels found`);
      console.log('   VIP1:', vipLevels.find(v => v.level === 1)?.task_reward, 'PKR per task');
    }

    // 2. Test user profiles with trial_tasks_completed
    console.log('\n2. Testing user profiles with trial_tasks_completed...');
    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, membership_level, vip_level, trial_tasks_completed')
      .limit(1);

    if (profileError) {
      console.error('❌ User profiles error:', profileError.message);
    } else {
      console.log('✅ User profiles working with trial_tasks_completed column');
      if (profiles.length > 0) {
        console.log('   Sample profile:', {
          membership_level: profiles[0].membership_level,
          vip_level: profiles[0].vip_level,
          trial_tasks_completed: profiles[0].trial_tasks_completed
        });
      }
    }

    // 3. Test membership plans with correct VIP levels
    console.log('\n3. Testing membership plans VIP assignments...');
    const { data: plans, error: plansError } = await supabase
      .from('membership_plans')
      .select('name, vip_level, price')
      .order('vip_level');

    if (plansError) {
      console.error('❌ Membership plans error:', plansError.message);
    } else {
      console.log('✅ Membership plans working:');
      plans.forEach(plan => {
        console.log(`   ${plan.name}: VIP${plan.vip_level} - ${plan.price} PKR`);
      });
    }

    // 4. Test user-profile join with all columns
    console.log('\n4. Testing user-profile join...');
    const { data: userWithProfile, error: joinError } = await supabase
      .from('users')
      .select(`
        id,
        username,
        user_profiles (
          membership_level,
          vip_level,
          trial_tasks_completed
        )
      `)
      .limit(1);

    if (joinError) {
      console.error('❌ User-profile join error:', joinError.message);
    } else {
      console.log('✅ User-profile join working');
      if (userWithProfile.length > 0 && userWithProfile[0].user_profiles) {
        console.log('   Profile data:', userWithProfile[0].user_profiles);
      }
    }

    // 5. Test VIP level lookup for new users
    console.log('\n5. Testing VIP level data for trial users...');
    const { data: trialVip, error: trialError } = await supabase
      .from('vip_levels')
      .select('*')
      .eq('level', 0)
      .single();

    if (trialError) {
      console.error('❌ Trial VIP level error:', trialError.message);
    } else {
      console.log('✅ Trial VIP level data:', {
        name: trialVip.name,
        task_reward: trialVip.task_reward,
        daily_tasks: trialVip.daily_tasks
      });
    }

    // 6. Test VIP1 level data
    console.log('\n6. Testing VIP1 level data...');
    const { data: vip1, error: vip1Error } = await supabase
      .from('vip_levels')
      .select('*')
      .eq('level', 1)
      .single();

    if (vip1Error) {
      console.error('❌ VIP1 level error:', vip1Error.message);
    } else {
      console.log('✅ VIP1 level data:', {
        name: vip1.name,
        task_reward: vip1.task_reward,
        daily_tasks: vip1.daily_tasks,
        monthly_fee: vip1.monthly_fee
      });
    }

    console.log('\n🎉 VIP data testing completed!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testVipFixes();