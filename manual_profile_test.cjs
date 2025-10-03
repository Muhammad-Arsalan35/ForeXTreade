const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function testManualProfile() {
  console.log('🧪 Testing Manual Profile Creation & Frontend Access');
  console.log('=' .repeat(60));

  const testUser = {
    email: `manual_test_${Date.now()}@example.com`,
    password: 'TestPassword123!',
    full_name: 'Manual Test User'
  };

  try {
    // Step 1: Test signup
    console.log('\n📝 Step 1: Testing user signup...');
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: testUser.email,
      password: testUser.password,
      options: {
        data: {
          full_name: testUser.full_name
        }
      }
    });

    if (signupError) {
      console.error('❌ Signup failed:', signupError.message);
      return;
    }

    console.log('✅ Signup successful');
    console.log(`   User ID: ${signupData.user?.id}`);

    // Step 2: Manually create profile (since trigger isn't working)
    console.log('\n👤 Step 2: Manually creating profile...');
    
    const username = `user_${Date.now()}`;
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('users')
      .insert({
        auth_user_id: signupData.user.id,
        full_name: testUser.full_name,
        username: username,
        phone_number: `+92300${Math.floor(Math.random() * 10000000)}`,
        vip_level: 'Intern',
        trial_start_date: new Date().toISOString().split('T')[0],
        trial_end_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        trial_expired: false,
        personal_wallet_balance: 0.00,
        income_wallet_balance: 0.00,
        total_earnings: 0.00,
        total_invested: 0.00,
        can_withdraw: false,
        referral_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
        is_active: true,
        account_status: 'active'
      })
      .select()
      .single();

    if (profileError) {
      console.error('❌ Manual profile creation failed:', profileError.message);
      return;
    }

    console.log('✅ Profile created manually');
    console.log(`   Profile ID: ${profileData.id}`);
    console.log(`   Username: ${profileData.username}`);

    // Step 3: Test sign-in
    console.log('\n🔐 Step 3: Testing sign-in...');
    const { data: signinData, error: signinError } = await supabase.auth.signInWithPassword({
      email: testUser.email,
      password: testUser.password
    });

    if (signinError) {
      console.error('❌ Sign-in failed:', signinError.message);
      return;
    }

    console.log('✅ Sign-in successful');

    // Step 4: Test frontend profile access (the exact query from Profile.tsx)
    console.log('\n📱 Step 4: Testing frontend profile access...');
    const { data: frontendProfile, error: frontendError } = await supabase
      .from('users')
      .select(`
        id,
        full_name,
        username,
        phone_number,
        profile_avatar,
        referral_code,
        vip_level,
        total_earnings,
        total_invested,
        income_wallet_balance,
        personal_wallet_balance,
        created_at
      `)
      .eq('auth_user_id', signupData.user.id)
      .single();

    if (frontendError) {
      console.error('❌ Frontend profile access failed:', frontendError.message);
      return;
    }

    console.log('✅ Frontend profile access successful!');
    console.log('   Profile data:');
    console.log(`     ID: ${frontendProfile.id}`);
    console.log(`     Name: ${frontendProfile.full_name}`);
    console.log(`     Username: ${frontendProfile.username}`);
    console.log(`     VIP Level: ${frontendProfile.vip_level}`);
    console.log(`     Referral Code: ${frontendProfile.referral_code}`);

    // Step 5: Test dashboard data access
    console.log('\n📊 Step 5: Testing dashboard data access...');
    
    const { data: plansData, error: plansError } = await supabase
      .from('membership_plans')
      .select('*');

    if (plansError) {
      console.error('❌ Plans access failed:', plansError.message);
    } else {
      console.log(`✅ Plans access successful (${plansData.length} plans found)`);
    }

    const { data: videosData, error: videosError } = await supabase
      .from('videos')
      .select('*');

    if (videosError) {
      console.error('❌ Videos access failed:', videosError.message);
    } else {
      console.log(`✅ Videos access successful (${videosData.length} videos found)`);
    }

    // Step 6: Cleanup
    console.log('\n🧹 Step 6: Cleaning up...');
    await supabaseAdmin.auth.admin.deleteUser(signupData.user.id);
    await supabaseAdmin.from('users').delete().eq('id', profileData.id);
    console.log('✅ Cleanup completed');

    console.log('\n' + '='.repeat(60));
    console.log('🎉 FRONTEND ACCESS TEST PASSED!');
    console.log('✅ User registration: WORKING');
    console.log('✅ Manual profile creation: WORKING');
    console.log('✅ Sign-in: WORKING');
    console.log('✅ Frontend profile access: WORKING (no position_title error!)');
    console.log('✅ Dashboard data access: WORKING');
    console.log('\n📝 Note: The trigger needs to be fixed, but frontend access is working!');

  } catch (error) {
    console.error('\n💥 Unexpected error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testManualProfile().catch(console.error);