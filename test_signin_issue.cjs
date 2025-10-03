const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
  console.log('SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Set' : '❌ Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSigninIssue() {
  console.log('🔍 Testing Signin Issue - User can register but cannot sign in');
  console.log('=' .repeat(60));

  const testEmail = `test_signin_${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';

  try {
    // Step 1: Test user registration
    console.log('\n📝 Step 1: Testing user registration...');
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });

    if (signUpError) {
      console.error('❌ Signup failed:', signUpError.message);
      return;
    }

    console.log('✅ Signup successful');
    console.log('User ID:', signUpData.user?.id);
    console.log('Email confirmed:', signUpData.user?.email_confirmed_at ? 'Yes' : 'No');

    // Step 2: Wait a moment for any triggers to complete
    console.log('\n⏳ Waiting 2 seconds for database triggers...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 3: Test immediate signin (should work if email confirmation not required)
    console.log('\n🔐 Step 2: Testing immediate signin...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    if (signInError) {
      console.error('❌ Signin failed:', signInError.message);
      console.log('Error details:', JSON.stringify(signInError, null, 2));
      
      // Check if it's an email confirmation issue
      if (signInError.message.includes('email') || signInError.message.includes('confirm')) {
        console.log('\n💡 This might be an email confirmation issue');
        console.log('Checking Supabase auth settings...');
      }
    } else {
      console.log('✅ Signin successful');
      console.log('User ID:', signInData.user?.id);
      console.log('Session:', signInData.session ? 'Created' : 'Not created');
    }

    // Step 4: Check user profile creation
    console.log('\n👤 Step 3: Checking user profile creation...');
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', signUpData.user?.id)
      .single();

    if (profileError) {
      console.error('❌ Profile check failed:', profileError.message);
    } else {
      console.log('✅ User profile found');
      console.log('Profile data:', JSON.stringify(profileData, null, 2));
    }

    // Step 5: Test signin after profile creation
    if (signInError) {
      console.log('\n🔐 Step 4: Retrying signin after profile check...');
      const { data: retrySignInData, error: retrySignInError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });

      if (retrySignInError) {
        console.error('❌ Retry signin failed:', retrySignInError.message);
      } else {
        console.log('✅ Retry signin successful');
      }
    }

    // Step 6: Check auth settings
    console.log('\n⚙️ Step 5: Checking auth configuration...');
    const { data: { session } } = await supabase.auth.getSession();
    console.log('Current session:', session ? 'Active' : 'None');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }

  console.log('\n' + '='.repeat(60));
  console.log('🏁 Signin issue test completed');
}

// Run the test
testSigninIssue().catch(console.error);