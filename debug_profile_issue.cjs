const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function debugProfileIssue() {
  console.log('🔍 Debugging Profile Creation Issue');
  console.log('=' .repeat(50));

  const testUser = {
    email: `debug_${Date.now()}@example.com`,
    password: 'TestPassword123!',
    full_name: 'Debug User'
  };

  try {
    // Step 1: Test signup
    console.log('\n📝 Step 1: Testing user signup...');
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: testUser.email,
      password: testUser.password,
      options: {
        data: {
          full_name: testUser.full_name
        }
      }
    });

    if (signupError) {
      console.error('❌ Signup failed:', signupError.message);
      return;
    }

    console.log('✅ Signup successful');
    console.log(`   User ID: ${signupData.user?.id}`);

    // Step 2: Wait and check multiple times
    console.log('\n⏳ Step 2: Waiting and checking profile creation...');
    
    for (let i = 1; i <= 5; i++) {
      console.log(`\n🔍 Check ${i}/5 (after ${i * 2} seconds):`);
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check how many profiles exist for this user
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('auth_user_id', signupData.user.id);

      if (profilesError) {
        console.error(`❌ Profile check ${i} failed:`, profilesError.message);
        continue;
      }

      console.log(`   Found ${profiles.length} profile(s)`);
      
      if (profiles.length > 0) {
        profiles.forEach((profile, index) => {
          console.log(`   Profile ${index + 1}:`);
          console.log(`     ID: ${profile.id}`);
          console.log(`     Username: ${profile.username}`);
          console.log(`     Full Name: ${profile.full_name}`);
          console.log(`     VIP Level: ${profile.vip_level}`);
        });
        break;
      }
    }

    // Step 3: Check auth.users table
    console.log('\n👤 Step 3: Checking auth.users table...');
    const { data: authUsers, error: authError } = await supabaseAdmin
      .from('auth.users')
      .select('*')
      .eq('id', signupData.user.id);

    if (authError) {
      console.error('❌ Auth users check failed:', authError.message);
    } else {
      console.log(`✅ Found ${authUsers.length} auth user(s)`);
      if (authUsers.length > 0) {
        console.log('   Auth user data:', JSON.stringify(authUsers[0], null, 2));
      }
    }

    // Step 4: Check trigger function exists
    console.log('\n🔧 Step 4: Checking trigger function...');
    const { data: triggerData, error: triggerError } = await supabaseAdmin
      .rpc('sql', {
        query: `
          SELECT 
            t.trigger_name,
            t.event_manipulation,
            t.event_object_table,
            p.proname as function_name
          FROM information_schema.triggers t
          JOIN pg_proc p ON p.oid = t.action_statement::regproc
          WHERE t.event_object_table = 'users' 
            AND t.event_object_schema = 'auth';
        `
      });

    if (triggerError) {
      console.error('❌ Trigger check failed:', triggerError.message);
    } else {
      console.log('✅ Trigger check results:', triggerData);
    }

    // Cleanup
    console.log('\n🧹 Cleaning up...');
    await supabaseAdmin.auth.admin.deleteUser(signupData.user.id);
    console.log('✅ Cleanup completed');

  } catch (error) {
    console.error('\n💥 Unexpected error:', error.message);
    console.error('Stack:', error.stack);
  }
}

debugProfileIssue().catch(console.error);