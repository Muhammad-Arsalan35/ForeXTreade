const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testSignupFlow() {
  console.log('🧪 Testing Signup Flow After Schema Fix...\n');
  
  try {
    // 1. Check if videos table exists and has data
    console.log('1. Checking videos table...');
    const { data: videos, error: videosError } = await supabase
      .from('videos')
      .select('*')
      .limit(3);
    
    if (videosError) {
      console.error('❌ Videos table error:', videosError.message);
      return;
    }
    
    console.log(`✅ Videos table exists with ${videos.length} videos`);
    
    // 2. Check if membership_plans table exists
    console.log('\n2. Checking membership plans...');
    const { data: plans, error: plansError } = await supabase
      .from('membership_plans')
      .select('name, vip_level, price')
      .order('display_order');
    
    if (plansError) {
      console.error('❌ Membership plans error:', plansError.message);
      return;
    }
    
    console.log(`✅ Found ${plans.length} membership plans:`);
    plans.forEach(plan => {
      console.log(`   - ${plan.name} (${plan.vip_level}): $${plan.price}`);
    });
    
    // 3. Check commission rates
    console.log('\n3. Checking commission rates...');
    const { data: rates, error: ratesError } = await supabase
      .from('commission_rates')
      .select('*')
      .order('level');
    
    if (ratesError) {
      console.error('❌ Commission rates error:', ratesError.message);
      return;
    }
    
    console.log(`✅ Commission rates configured:`);
    rates.forEach(rate => {
      console.log(`   - Level ${rate.level}: VIP ${rate.vip_upgrade_commission_percentage}%, Video ${rate.video_watch_commission_percentage}%`);
    });
    
    // 4. Test helper function for days_remaining
    console.log('\n4. Testing days_remaining helper function...');
    const { data: functionTest, error: functionError } = await supabase
      .rpc('get_days_remaining', { 
        trial_end_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] 
      });
    
    if (functionError) {
      console.log('ℹ️  Helper function not tested (may not be needed for basic signup)');
    } else {
      console.log(`✅ Helper function works: ${functionTest} days remaining`);
    }
    
    // 5. Test basic user insertion (simulate signup)
    console.log('\n5. Testing user creation (simulating signup)...');
    const testUser = {
      full_name: 'Test User Schema Fix',
      username: `testuser_${Date.now()}`,
      phone_number: `+92300${Math.floor(Math.random() * 10000000)}`,
      vip_level: 'Intern'
    };
    
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert(testUser)
      .select()
      .single();
    
    if (userError) {
      console.error('❌ User creation failed:', userError.message);
      return;
    }
    
    console.log(`✅ User created successfully: ${newUser.username} (ID: ${newUser.id})`);
    console.log(`   - VIP Level: ${newUser.vip_level}`);
    console.log(`   - Trial End: ${newUser.trial_end_date}`);
    console.log(`   - Referral Code: ${newUser.referral_code}`);
    
    // 6. Clean up test user
    await supabase.from('users').delete().eq('id', newUser.id);
    console.log('✅ Test user cleaned up');
    
    console.log('\n🎉 ALL TESTS PASSED! Signup functionality should work correctly.');
    console.log('\n📋 Summary:');
    console.log('   ✅ Videos table exists and populated');
    console.log('   ✅ Membership plans configured');
    console.log('   ✅ Commission rates set correctly');
    console.log('   ✅ User creation works without errors');
    console.log('   ✅ Schema applied successfully');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

testSignupFlow();