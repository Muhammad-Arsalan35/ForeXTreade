const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function testVipDataAfterFix() {
  console.log('🧪 Testing VIP Data After Fix...\n');

  try {
    // 1. Test VIP levels table
    console.log('1. Testing VIP levels table...');
    const { data: vipLevels, error: vipError } = await supabase
      .from('vip_levels')
      .select('*')
      .order('level');

    if (vipError) {
      console.error('❌ VIP levels error:', vipError);
    } else {
      console.log(`✅ VIP levels table: ${vipLevels?.length} levels found`);
      console.log('   Sample levels:', vipLevels?.slice(0, 3).map(v => `${v.name} (Level ${v.level})`));
    }

    // 2. Test user profiles with trial_tasks_completed
    console.log('\n2. Testing user profiles with trial_tasks_completed...');
    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, username, membership_level, vip_level, trial_tasks_completed')
      .limit(3);

    if (profileError) {
      console.error('❌ User profiles error:', profileError);
    } else {
      console.log(`✅ User profiles: ${profiles?.length} profiles found`);
      profiles?.forEach(p => {
        console.log(`   - ${p.username}: ${p.membership_level}, VIP${p.vip_level}, Tasks: ${p.trial_tasks_completed}`);
      });
    }

    // 3. Test membership plans with correct VIP levels
    console.log('\n3. Testing membership plans...');
    const { data: plans, error: plansError } = await supabase
      .from('membership_plans')
      .select('name, vip_level, price')
      .order('vip_level');

    if (plansError) {
      console.error('❌ Membership plans error:', plansError);
    } else {
      console.log(`✅ Membership plans: ${plans?.length} plans found`);
      plans?.forEach(p => {
        console.log(`   - ${p.name}: VIP Level ${p.vip_level}, Price: ${p.price}`);
      });
    }

    // 4. Test user-profile join (this was failing before)
    console.log('\n4. Testing user-profile join...');
    const { data: joinData, error: joinError } = await supabase
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
      .limit(2);

    if (joinError) {
      console.error('❌ User-profile join error:', joinError);
    } else {
      console.log(`✅ User-profile join: ${joinData?.length} records found`);
      joinData?.forEach(u => {
        const profile = u.user_profiles?.[0];
        if (profile) {
          console.log(`   - ${u.username}: ${profile.membership_level}, VIP${profile.vip_level}, Tasks: ${profile.trial_tasks_completed}`);
        }
      });
    }

    // 5. Test specific VIP level data fetching
    console.log('\n5. Testing specific VIP level data...');
    const { data: trialLevel, error: trialError } = await supabase
      .from('vip_levels')
      .select('*')
      .eq('level', 0)
      .single();

    if (trialError) {
      console.error('❌ Trial level error:', trialError);
    } else {
      console.log(`✅ Trial level: ${trialLevel?.name}, ${trialLevel?.daily_tasks} tasks, ${trialLevel?.task_reward} PKR`);
    }

    const { data: vip1Level, error: vip1Error } = await supabase
      .from('vip_levels')
      .select('*')
      .eq('level', 1)
      .single();

    if (vip1Error) {
      console.error('❌ VIP1 level error:', vip1Error);
    } else {
      console.log(`✅ VIP1 level: ${vip1Level?.name}, ${vip1Level?.daily_tasks} tasks, ${vip1Level?.task_reward} PKR`);
    }

    // 6. Test new user signup simulation
    console.log('\n6. Testing new user signup simulation...');
    const testEmail = `test_${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';

    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword
    });

    if (signupError) {
      console.error('❌ Signup error:', signupError);
    } else {
      console.log('✅ Signup successful, checking profile creation...');
      
      // Wait a moment for trigger to execute
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if profile was created
      const { data: newProfile, error: newProfileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', signupData.user?.id)
        .single();

      if (newProfileError) {
        console.error('❌ New profile error:', newProfileError);
      } else {
        console.log(`✅ New profile created: ${newProfile?.username}, ${newProfile?.membership_level}, VIP${newProfile?.vip_level}, Tasks: ${newProfile?.trial_tasks_completed}`);
      }
    }

    console.log('\n🎉 VIP Data Testing Complete!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testVipDataAfterFix();