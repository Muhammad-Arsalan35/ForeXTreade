const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function detailedSignupDebug() {
  console.log('🔍 Detailed Signup Debug After RLS Fix');
  console.log('=' .repeat(50));

  try {
    // Step 1: Check if all required tables exist
    console.log('\n📋 Step 1: Checking table existence...');
    const tables = ['users', 'membership_plans', 'commission_rates', 'videos', 'payment_methods', 'system_settings'];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabaseAdmin
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          console.error(`❌ Table ${table}:`, error.message);
        } else {
          console.log(`✅ Table ${table}: Exists`);
        }
      } catch (err) {
        console.error(`❌ Table ${table}:`, err.message);
      }
    }

    // Step 2: Check RLS status
    console.log('\n🛡️ Step 2: Checking RLS status...');
    try {
      const { data: rlsData, error: rlsError } = await supabaseAdmin.rpc('sql', {
        query: `
          SELECT schemaname, tablename, rowsecurity 
          FROM pg_tables 
          WHERE schemaname = 'public' 
          AND tablename IN ('users', 'membership_plans', 'commission_rates', 'videos', 'payment_methods', 'system_settings')
          ORDER BY tablename;
        `
      });

      if (rlsError) {
        console.error('❌ RLS check failed:', rlsError.message);
      } else {
        console.log('✅ RLS status:', rlsData);
      }
    } catch (err) {
      console.log('⚠️ Could not check RLS status directly');
    }

    // Step 3: Test auth.users trigger
    console.log('\n🔧 Step 3: Testing trigger function...');
    try {
      const { data: triggerData, error: triggerError } = await supabaseAdmin.rpc('sql', {
        query: `
          SELECT trigger_name, event_manipulation, action_statement 
          FROM information_schema.triggers 
          WHERE trigger_schema = 'auth' 
          AND event_object_table = 'users';
        `
      });

      if (triggerError) {
        console.error('❌ Trigger check failed:', triggerError.message);
      } else {
        console.log('✅ Triggers on auth.users:', triggerData);
      }
    } catch (err) {
      console.log('⚠️ Could not check triggers directly');
    }

    // Step 4: Test signup with detailed error logging
    console.log('\n📝 Step 4: Testing signup with detailed logging...');
    const testEmail = `debug_test_${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';

    console.log('Attempting signup with:', { email: testEmail });

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });

    if (signUpError) {
      console.error('❌ Signup failed:');
      console.error('   Message:', signUpError.message);
      console.error('   Status:', signUpError.status);
      console.error('   Code:', signUpError.code);
      console.error('   Full error:', JSON.stringify(signUpError, null, 2));
    } else {
      console.log('✅ Signup successful:');
      console.log('   User ID:', signUpData.user?.id);
      console.log('   Email:', signUpData.user?.email);
      console.log('   Email confirmed:', signUpData.user?.email_confirmed_at);
      console.log('   Session:', signUpData.session ? 'Created' : 'Not created');

      // Wait and check if profile was created
      console.log('\n⏳ Waiting 3 seconds for trigger...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      console.log('\n👤 Checking profile creation...');
      const { data: profileData, error: profileError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('auth_user_id', signUpData.user?.id);

      if (profileError) {
        console.error('❌ Profile check failed:', profileError.message);
      } else {
        console.log('✅ Profile created:', profileData);
      }
    }

    // Step 5: Check auth configuration
    console.log('\n⚙️ Step 5: Checking auth configuration...');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Current session:', session ? 'Active' : 'None');
    } catch (err) {
      console.error('Session check failed:', err.message);
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error('Stack trace:', error.stack);
  }

  console.log('\n' + '='.repeat(50));
  console.log('🏁 Detailed debug completed');
}

// Run the debug
detailedSignupDebug().catch(console.error);