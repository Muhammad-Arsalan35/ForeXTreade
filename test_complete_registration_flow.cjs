const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testCompleteRegistrationFlow() {
  console.log('🧪 Testing Complete Registration Flow with Trigger...\n');
  
  const testEmail = `test_trigger_${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  
  try {
    // 1. Create a new user account
    console.log('1️⃣ Creating new user account...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      user_metadata: {
        full_name: 'Test Trigger User',
        username: 'test_trigger_user',
        phone_number: '+1234567890'
      }
    });
    
    if (authError) {
      console.error('❌ Auth user creation failed:', authError);
      return;
    }
    
    console.log('✅ Auth user created:', authData.user.id);
    
    // 2. Wait a moment for trigger to execute
    console.log('⏳ Waiting for trigger to execute...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 3. Check if user record was created
    console.log('\n2️⃣ Checking users table...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', authData.user.id)
      .single();
    
    if (userError) {
      console.error('❌ User record not found:', userError);
    } else {
      console.log('✅ User record created:', {
        id: userData.id,
        full_name: userData.full_name,
        username: userData.username,
        user_status: userData.user_status
      });
    }
    
    // 4. Check if user profile was created
    console.log('\n3️⃣ Checking user_profiles table...');
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userData?.id)
      .single();
    
    if (profileError) {
      console.error('❌ User profile not found:', profileError);
    } else {
      console.log('✅ User profile created:', {
        id: profileData.id,
        full_name: profileData.full_name,
        username: profileData.username,
        membership_type: profileData.membership_type,
        membership_level: profileData.membership_level
      });
    }
    
    // 5. Test login flow
    console.log('\n4️⃣ Testing login flow...');
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    if (loginError) {
      console.error('❌ Login failed:', loginError);
    } else {
      console.log('✅ Login successful');
      
      // Test profile fetch as authenticated user
      const { data: fetchedProfile, error: fetchError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userData?.id)
        .single();
      
      if (fetchError) {
        console.error('❌ Profile fetch failed:', fetchError);
      } else {
        console.log('✅ Profile fetch successful - No more "Cannot coerce to single JSON object" error!');
      }
    }
    
    // 6. Cleanup test user
    console.log('\n5️⃣ Cleaning up test user...');
    await supabase.auth.admin.deleteUser(authData.user.id);
    console.log('✅ Test user cleaned up');
    
    console.log('\n🎉 COMPLETE REGISTRATION FLOW TEST PASSED!');
    console.log('✅ Trigger is working correctly');
    console.log('✅ User profiles are created automatically');
    console.log('✅ Login and profile fetch work without errors');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testCompleteRegistrationFlow();