const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function diagnoseProfileAccess() {
  console.log('🔍 Diagnosing Profile Access Issue');
  console.log('=' .repeat(50));

  try {
    // Step 1: Check if RLS is enabled on users table
    console.log('\n📋 Step 1: Checking RLS status on users table...');
    const { data: rlsData, error: rlsError } = await supabaseAdmin
      .from('pg_class')
      .select('relname, relrowsecurity')
      .eq('relname', 'users');

    if (rlsError) {
      console.error('❌ RLS check failed:', rlsError.message);
    } else {
      console.log('✅ RLS status:', rlsData);
    }

    // Step 2: Check existing RLS policies
    console.log('\n🛡️ Step 2: Checking RLS policies for users table...');
    const { data: policiesData, error: policiesError } = await supabaseAdmin.rpc('exec', {
      sql: `
        SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
        FROM pg_policies 
        WHERE tablename = 'users';
      `
    });

    if (policiesError) {
      console.error('❌ Policies check failed:', policiesError.message);
    } else {
      console.log('✅ Current policies:', JSON.stringify(policiesData, null, 2));
    }

    // Step 3: Test with authenticated user
    console.log('\n👤 Step 3: Testing profile access with authenticated user...');
    
    // Create a test user
    const testEmail = `profile_test_${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });

    if (signUpError) {
      console.error('❌ Signup failed:', signUpError.message);
      return;
    }

    console.log('✅ Test user created:', signUpData.user?.id);

    // Wait for triggers
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Sign in the user
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    if (signInError) {
      console.error('❌ Signin failed:', signInError.message);
      return;
    }

    console.log('✅ User signed in successfully');

    // Try to access profile
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', signUpData.user?.id);

    if (profileError) {
      console.error('❌ Profile access failed:', profileError.message);
      console.log('Error details:', JSON.stringify(profileError, null, 2));
    } else {
      console.log('✅ Profile access successful:', profileData);
    }

    // Step 4: Check if profile was created by trigger
    console.log('\n🔧 Step 4: Checking if profile was created by trigger (admin access)...');
    const { data: adminProfileData, error: adminProfileError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', signUpData.user?.id);

    if (adminProfileError) {
      console.error('❌ Admin profile check failed:', adminProfileError.message);
    } else {
      console.log('✅ Profile exists (admin view):', adminProfileData);
    }

    // Step 5: Check auth.users table
    console.log('\n🔐 Step 5: Checking auth.users table...');
    const { data: authUserData, error: authUserError } = await supabaseAdmin.rpc('exec', {
      sql: `SELECT id, email, email_confirmed_at, created_at FROM auth.users WHERE id = '${signUpData.user?.id}';`
    });

    if (authUserError) {
      console.error('❌ Auth user check failed:', authUserError.message);
    } else {
      console.log('✅ Auth user data:', authUserData);
    }

  } catch (error) {
    console.error('❌ Diagnosis failed:', error.message);
    console.error('Stack trace:', error.stack);
  }

  console.log('\n' + '='.repeat(50));
  console.log('🏁 Profile access diagnosis completed');
}

// Run the diagnosis
diagnoseProfileAccess().catch(console.error);