const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function testActualSignup() {
  console.log('🧪 Testing Actual Signup Process');
  console.log('=' .repeat(50));

  const testEmail = `actual_test_${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';

  try {
    console.log('\n📝 Step 1: Attempting signup...');
    console.log('Email:', testEmail);

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });

    if (signUpError) {
      console.error('❌ Signup failed:');
      console.error('   Message:', signUpError.message);
      console.error('   Code:', signUpError.code);
      console.error('   Status:', signUpError.status);
      
      // Let's try to understand what's happening in the database
      console.log('\n🔍 Investigating database state...');
      
      // Check if any user was created in auth.users
      try {
        const { data: authUsers, error: authError } = await supabaseAdmin.rpc('sql', {
          query: `SELECT id, email, created_at FROM auth.users WHERE email = '${testEmail}' ORDER BY created_at DESC LIMIT 1;`
        });
        
        if (authError) {
          console.log('⚠️ Could not check auth.users:', authError.message);
        } else {
          console.log('📊 Auth users check:', authUsers);
        }
      } catch (err) {
        console.log('⚠️ Auth check failed:', err.message);
      }
      
      return;
    }

    console.log('✅ Signup successful!');
    console.log('   User ID:', signUpData.user?.id);
    console.log('   Email:', signUpData.user?.email);
    console.log('   Email confirmed:', signUpData.user?.email_confirmed_at);

    // Wait a moment for trigger to execute
    console.log('\n⏳ Waiting 3 seconds for trigger execution...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check if profile was created
    console.log('\n👤 Step 2: Checking profile creation...');
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('auth_user_id', signUpData.user?.id);

    if (profileError) {
      console.error('❌ Profile check failed:', profileError.message);
    } else if (profileData && profileData.length > 0) {
      console.log('✅ Profile created successfully:');
      console.log('   Full name:', profileData[0].full_name);
      console.log('   Username:', profileData[0].username);
      console.log('   VIP level:', profileData[0].vip_level);
      console.log('   Trial period:', profileData[0].trial_start_date, 'to', profileData[0].trial_end_date);
    } else {
      console.log('❌ No profile found for user');
    }

    // Test signin
    console.log('\n🔐 Step 3: Testing signin...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    if (signInError) {
      console.error('❌ Signin failed:', signInError.message);
    } else {
      console.log('✅ Signin successful!');
      console.log('   Session active:', !!signInData.session);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }

  console.log('\n' + '='.repeat(50));
  console.log('🏁 Actual signup test completed');
}

testActualSignup().catch(console.error);