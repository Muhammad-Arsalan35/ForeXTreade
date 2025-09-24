const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function testCompleteUserFlow() {
  console.log('🧪 Testing complete user registration flow...\n');
  
  const testEmail = `test_complete_${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  
  try {
    // Step 1: Test user signup
    console.log('📝 Step 1: Testing user signup...');
    console.log(`   Email: ${testEmail}`);
    
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Test Complete User',
          phone_number: '+1234567890'
        }
      }
    });
    
    if (signupError) {
      console.log('❌ Signup failed:', signupError.message);
      return;
    }
    
    console.log('✅ Signup successful');
    console.log(`   Auth User ID: ${signupData.user?.id}`);
    
    // Step 2: Wait a moment for trigger to process
    console.log('\n⏳ Step 2: Waiting for trigger to process...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 3: Check if user record was created
    console.log('\n🔍 Step 3: Checking user record creation...');
    
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', signupData.user.id)
      .single();
    
    if (userError) {
      console.log('❌ User record not found:', userError.message);
      return;
    }
    
    console.log('✅ User record found');
    console.log(`   User ID: ${userData.id}`);
    console.log(`   Username: ${userData.username}`);
    console.log(`   VIP Level: ${userData.vip_level}`);
    console.log(`   Status: ${userData.user_status}`);
    
    // Step 4: Check if user profile was created
    console.log('\n👤 Step 4: Checking user profile creation...');
    
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userData.id)
      .single();
    
    if (profileError) {
      console.log('❌ User profile not found:', profileError.message);
      return;
    }
    
    console.log('✅ User profile found');
    console.log(`   Profile ID: ${profileData.id}`);
    console.log(`   Membership Type: ${profileData.membership_type}`);
    console.log(`   Trial End Date: ${profileData.intern_trial_end_date}`);
    console.log(`   Days Remaining: ${profileData.days_remaining}`);
    
    // Step 5: Test user login
    console.log('\n🔐 Step 5: Testing user login...');
    
    // First sign out
    await supabase.auth.signOut();
    
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    if (loginError) {
      console.log('❌ Login failed:', loginError.message);
      return;
    }
    
    console.log('✅ Login successful');
    console.log(`   Session ID: ${loginData.session?.access_token?.substring(0, 20)}...`);
    
    // Step 6: Test data access with RLS
    console.log('\n🔒 Step 6: Testing RLS policies...');
    
    const { data: userDataRLS, error: userErrorRLS } = await supabase
      .from('users')
      .select('username, vip_level, user_status')
      .eq('auth_user_id', loginData.user.id)
      .single();
    
    if (userErrorRLS) {
      console.log('❌ RLS test failed:', userErrorRLS.message);
      return;
    }
    
    console.log('✅ RLS policies working correctly');
    console.log(`   Accessible data: ${JSON.stringify(userDataRLS, null, 2)}`);
    
    // Step 7: Test task completions table access
    console.log('\n📋 Step 7: Testing task completions table...');
    
    const { data: taskData, error: taskError } = await supabase
      .from('task_completions')
      .select('*')
      .eq('user_id', userData.id);
    
    if (taskError) {
      console.log('❌ Task completions table access failed:', taskError.message);
    } else {
      console.log('✅ Task completions table accessible');
      console.log(`   Current task completions: ${taskData.length}`);
    }
    
    // Step 8: Final verification
    console.log('\n✅ Step 8: Final verification...');
    
    const { data: finalCheck, error: finalError } = await supabase
      .from('users')
      .select(`
        id,
        username,
        vip_level,
        user_status,
        user_profiles (
          id,
          membership_type,
          membership_level,
          days_remaining
        )
      `)
      .eq('auth_user_id', loginData.user.id)
      .single();
    
    if (finalError) {
      console.log('❌ Final verification failed:', finalError.message);
      return;
    }
    
    console.log('🎉 COMPLETE USER FLOW TEST SUCCESSFUL!');
    console.log('\n📊 Final User Data:');
    console.log(JSON.stringify(finalCheck, null, 2));
    
    // Clean up - sign out
    await supabase.auth.signOut();
    console.log('\n🧹 Cleanup completed - user signed out');
    
  } catch (error) {
    console.error('❌ Unexpected error during test:', error);
  }
}

// Run the test
testCompleteUserFlow().catch(console.error);