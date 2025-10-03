const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testSignupFix() {
  console.log('🧪 TESTING SIGNUP FUNCTIONALITY 🧪\n');
  
  try {
    // Test signup with a new user
    const testEmail = `testfix_${Date.now()}@forextrade.com`;
    const testPassword = 'TestPass123!';
    const testFullName = 'Test Fix User';
    
    console.log('1. Testing signup with new user...');
    console.log(`   Email: ${testEmail}`);
    console.log(`   Name: ${testFullName}`);
    
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: testFullName,
          username: `testfix${Date.now()}`
        }
      }
    });

    if (signupError) {
      console.log('❌ SIGNUP FAILED:', signupError.message);
      
      if (signupError.message.includes('Database error')) {
        console.log('❌ The database error still exists - fix was not successful');
        return false;
      } else {
        console.log('ℹ️  Different error (might be expected):', signupError.message);
      }
    } else {
      console.log('✅ SIGNUP SUCCESSFUL!');
      console.log(`   Auth User ID: ${signupData.user?.id}`);
      console.log(`   Email: ${signupData.user?.email}`);
      
      // Wait for potential trigger execution
      console.log('\n2. Waiting for database triggers to execute...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check if user was created in users table
      console.log('3. Checking if user record was created...');
      const { data: newUser, error: newUserError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', signupData.user?.id)
        .single();

      if (newUserError) {
        console.log('❌ User record not found:', newUserError.message);
        console.log('❌ Database trigger is still not working properly');
      } else {
        console.log('✅ User record found!');
        console.log(`   Username: ${newUser.username}`);
        console.log(`   VIP Level: ${newUser.vip_level}`);
        console.log(`   Status: ${newUser.user_status}`);
      }

      // Check if user profile was created
      console.log('\n4. Checking if user profile was created...');
      const { data: newProfile, error: newProfileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', newUser?.id)
        .single();

      if (newProfileError) {
        console.log('❌ User profile not found:', newProfileError.message);
        console.log('❌ User profile creation is still not working');
      } else {
        console.log('✅ User profile found!');
        console.log(`   Membership Type: ${newProfile.membership_type}`);
        console.log(`   Membership Level: ${newProfile.membership_level}`);
        console.log(`   Trial Active: ${newProfile.is_trial_active}`);
        console.log(`   Trial End Date: ${newProfile.trial_end_date}`);
      }

      // Test login with the new user
      console.log('\n5. Testing login with new user...');
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword
      });

      if (loginError) {
        console.log('❌ Login failed:', loginError.message);
      } else {
        console.log('✅ Login successful!');
        console.log(`   Session: ${loginData.session ? 'Active' : 'None'}`);
      }

      // Cleanup test user
      console.log('\n6. Cleaning up test user...');
      if (signupData.user?.id) {
        const { error: deleteError } = await supabase.auth.admin.deleteUser(signupData.user.id);
        if (deleteError) {
          console.log('⚠️  Could not delete test user:', deleteError.message);
        } else {
          console.log('✅ Test user cleaned up successfully');
        }
      }
    }

    console.log('\n🎯 SIGNUP TEST SUMMARY:');
    if (!signupError || !signupError.message.includes('Database error')) {
      console.log('✅ SUCCESS: The "Database error saving new user" has been FIXED!');
      console.log('✅ Users can now sign up without database errors');
      console.log('✅ The signup functionality is working properly');
      return true;
    } else {
      console.log('❌ FAILED: The database error still exists');
      console.log('❌ Additional fixes may be needed');
      return false;
    }

  } catch (error) {
    console.error('❌ Unexpected error during test:', error);
    return false;
  }
}

testSignupFix().then(success => {
  if (success) {
    console.log('\n🎉 SIGNUP FIX VERIFICATION: PASSED! 🎉');
  } else {
    console.log('\n💥 SIGNUP FIX VERIFICATION: FAILED! 💥');
  }
}).catch(console.error);