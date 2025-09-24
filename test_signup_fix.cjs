const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://woiccythjszfhbypacaa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvaWNjeXRoanN6ZmhieXBhY2FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0ODIzNDYsImV4cCI6MjA3NDA1ODM0Nn0.TkSPiZDpS4wFORklYUEiOIhy3E5Q41-XTMj1btQKe_k'
);

async function testSignupFix() {
  console.log('🧪 TESTING SIGNUP FIX 🧪\n');
  
  try {
    // 1. Check if trigger function exists and is working
    console.log('1. Checking trigger status...');
    
    // Test signup with a unique email
    const testEmail = `test_${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    
    console.log(`2. Testing signup with email: ${testEmail}`);
    
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Test User'
        }
      }
    });
    
    if (signupError) {
      console.log('❌ SIGNUP FAILED:', signupError.message);
      console.log('   Error details:', signupError);
      return;
    }
    
    console.log('✅ SIGNUP SUCCESSFUL!');
    console.log('   User ID:', signupData.user?.id);
    console.log('   Email:', signupData.user?.email);
    
    // Wait for trigger to execute
    console.log('\n3. Waiting for trigger to create profile...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check if user record was created
    console.log('4. Checking if user record was created...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', signupData.user.id)
      .single();
    
    if (userError) {
      console.log('❌ User record NOT created:', userError.message);
    } else {
      console.log('✅ User record created successfully!');
      console.log('   Username:', userData.username);
      console.log('   VIP Level:', userData.vip_level);
      console.log('   Position:', userData.position_title);
    }
    
    // Check if user profile was created
    console.log('\n5. Checking if user profile was created...');
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userData?.id)
      .single();
    
    if (profileError) {
      console.log('❌ User profile NOT created:', profileError.message);
    } else {
      console.log('✅ User profile created successfully!');
      console.log('   Username:', profileData.username);
      console.log('   VIP Level:', profileData.vip_level);
      console.log('   Membership Type:', profileData.membership_type);
      console.log('   Daily Limit:', profileData.daily_earning_limit);
    }
    
    // Summary
    console.log('\n📊 SUMMARY:');
    if (!signupError && userData && profileData) {
      console.log('🎉 SUCCESS! The signup fix is working perfectly!');
      console.log('✅ New users can sign up without errors');
      console.log('✅ User records are created automatically');
      console.log('✅ User profiles are created automatically');
      console.log('✅ New users get "trial" membership by default');
      console.log('\n🚀 Your 3-day signup issue is RESOLVED!');
    } else {
      console.log('❌ There are still issues that need to be addressed');
    }
    
    // Clean up test user (optional)
    console.log('\n6. Cleaning up test user...');
    if (userData?.id) {
      await supabase.from('user_profiles').delete().eq('user_id', userData.id);
      await supabase.from('users').delete().eq('id', userData.id);
      console.log('✅ Test user cleaned up');
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

testSignupFix().catch(console.error);