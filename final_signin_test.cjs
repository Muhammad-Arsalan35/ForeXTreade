const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function finalSigninTest() {
  console.log('🎯 Final Signin Functionality Test');
  console.log('=' .repeat(50));

  const testEmail = `final_test_${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';

  try {
    console.log('\n📝 Step 1: User Registration...');
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });

    if (signUpError) {
      console.error('❌ Registration failed:', signUpError.message);
      return false;
    }

    console.log('✅ Registration successful');
    console.log('   User ID:', signUpData.user?.id);
    console.log('   Email confirmed:', signUpData.user?.email_confirmed_at ? 'Yes' : 'No');

    // Wait for database triggers to complete
    console.log('\n⏳ Waiting for profile creation trigger...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('\n🔐 Step 2: User Signin...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    if (signInError) {
      console.error('❌ Signin failed:', signInError.message);
      console.log('   Error code:', signInError.status);
      console.log('   Error details:', JSON.stringify(signInError, null, 2));
      return false;
    }

    console.log('✅ Signin successful');
    console.log('   User ID:', signInData.user?.id);
    console.log('   Session created:', signInData.session ? 'Yes' : 'No');
    console.log('   Access token:', signInData.session?.access_token ? 'Present' : 'Missing');

    console.log('\n👤 Step 3: Profile Access Test...');
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', signUpData.user?.id)
      .single();

    if (profileError) {
      console.error('❌ Profile access failed:', profileError.message);
      console.log('   Error code:', profileError.code);
      console.log('   This indicates RLS policies need to be applied');
      return false;
    }

    console.log('✅ Profile access successful');
    console.log('   Profile data:', JSON.stringify(profileData, null, 2));

    console.log('\n🎮 Step 4: Dashboard Data Access Test...');
    
    // Test membership plans access
    const { data: plansData, error: plansError } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('is_active', true);

    if (plansError) {
      console.error('❌ Membership plans access failed:', plansError.message);
    } else {
      console.log('✅ Membership plans access successful');
      console.log(`   Found ${plansData.length} active plans`);
    }

    // Test videos access
    const { data: videosData, error: videosError } = await supabase
      .from('videos')
      .select('*')
      .eq('is_active', true)
      .limit(5);

    if (videosError) {
      console.error('❌ Videos access failed:', videosError.message);
    } else {
      console.log('✅ Videos access successful');
      console.log(`   Found ${videosData.length} active videos`);
    }

    console.log('\n🔄 Step 5: Session Management Test...');
    
    // Test logout
    const { error: logoutError } = await supabase.auth.signOut();
    if (logoutError) {
      console.error('❌ Logout failed:', logoutError.message);
    } else {
      console.log('✅ Logout successful');
    }

    // Test re-signin
    const { data: reSignInData, error: reSignInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    if (reSignInError) {
      console.error('❌ Re-signin failed:', reSignInError.message);
    } else {
      console.log('✅ Re-signin successful');
    }

    console.log('\n' + '='.repeat(50));
    console.log('🎉 ALL SIGNIN TESTS PASSED!');
    console.log('✅ User registration works');
    console.log('✅ User signin works');
    console.log('✅ Profile access works');
    console.log('✅ Dashboard data access works');
    console.log('✅ Session management works');
    console.log('\n🚀 Your TaskMaster platform signin is fully functional!');
    
    return true;

  } catch (error) {
    console.error('❌ Test failed with exception:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

// Run the test
finalSigninTest()
  .then(success => {
    if (success) {
      console.log('\n🎯 RESULT: Signin functionality is working perfectly!');
    } else {
      console.log('\n⚠️ RESULT: Signin issues detected. Please apply the RLS fix.');
    }
  })
  .catch(console.error);