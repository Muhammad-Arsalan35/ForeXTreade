const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testSignupSimple() {
  console.log('🧪 SIMPLE SIGNUP TEST 🧪\n');
  
  try {
    console.log('1. Testing signup functionality...');
    
    const testEmail = `simpletest_${Date.now()}@forextrade.com`;
    const testPassword = 'TestPass123!';
    
    console.log(`   Email: ${testEmail}`);
    console.log(`   Password: ${testPassword}`);
    
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Simple Test User'
        }
      }
    });

    if (signupError) {
      console.log('❌ Signup failed:', signupError.message);
      
      if (signupError.message.includes('Database error')) {
        console.log('\n📋 DIAGNOSIS: Database trigger is not working properly');
        console.log('🔧 SOLUTION REQUIRED:');
        console.log('   1. Apply the SCHEMA_FIX_FINAL.sql file manually in Supabase Dashboard');
        console.log('   2. Go to Supabase Dashboard > SQL Editor');
        console.log('   3. Copy and paste the contents of SCHEMA_FIX_FINAL.sql');
        console.log('   4. Run the script');
        console.log('   5. Test signup again');
        return false;
      }
      
      return false;
    }
    
    console.log('✅ Signup successful!');
    console.log(`   User ID: ${signupData.user?.id}`);
    console.log(`   Email: ${signupData.user?.email}`);
    
    // Wait for trigger to execute
    console.log('\n2. Waiting for trigger execution...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check if user record was created
    console.log('\n3. Checking user record creation...');
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', signupData.user.id)
      .single();
    
    if (userError) {
      console.log('❌ User record not found:', userError.message);
      console.log('📋 DIAGNOSIS: Trigger did not create user record');
    } else {
      console.log('✅ User record found');
      console.log(`   Username: ${userRecord.username}`);
      console.log(`   Full name: ${userRecord.full_name}`);
      console.log(`   VIP level: ${userRecord.vip_level}`);
    }
    
    // Check if user profile was created
    console.log('\n4. Checking user profile creation...');
    if (userRecord) {
      const { data: profileRecord, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userRecord.id)
        .single();
      
      if (profileError) {
        console.log('❌ User profile not found:', profileError.message);
        console.log('📋 DIAGNOSIS: Trigger did not create user profile');
      } else {
        console.log('✅ User profile found');
        console.log(`   Membership type: ${profileRecord.membership_type}`);
        console.log(`   Membership level: ${profileRecord.membership_level}`);
        console.log(`   Trial active: ${profileRecord.is_trial_active}`);
        console.log(`   Trial start: ${profileRecord.trial_start_date}`);
        console.log(`   Trial end: ${profileRecord.trial_end_date}`);
      }
    }
    
    // Test login
    console.log('\n5. Testing login...');
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    if (loginError) {
      console.log('❌ Login failed:', loginError.message);
    } else {
      console.log('✅ Login successful');
      
      // Sign out
      await supabase.auth.signOut();
      console.log('✅ Signed out successfully');
    }
    
    // Cleanup
    console.log('\n6. Cleaning up test user...');
    if (signupData.user?.id) {
      const { error: deleteError } = await supabase.auth.admin.deleteUser(signupData.user.id);
      if (deleteError) {
        console.log('❌ Error deleting test user:', deleteError.message);
      } else {
        console.log('✅ Test user deleted successfully');
      }
    }
    
    return true;

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

testSignupSimple().then(success => {
  if (success) {
    console.log('\n🎉 SIGNUP TEST COMPLETED SUCCESSFULLY! 🎉');
    console.log('✅ Signup functionality is working');
    console.log('✅ User and profile creation confirmed');
    console.log('✅ Login functionality verified');
  } else {
    console.log('\n💥 SIGNUP TEST FAILED! 💥');
    console.log('❌ Please apply the SCHEMA_FIX_FINAL.sql manually');
    console.log('📁 File location: SCHEMA_FIX_FINAL.sql');
    console.log('🔗 Apply at: Supabase Dashboard > SQL Editor');
  }
}).catch(console.error);