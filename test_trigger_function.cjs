const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function testTriggerFunction() {
  console.log('🔧 Testing Trigger Function After RLS Fix');
  console.log('=' .repeat(50));

  try {
    // Step 1: Check if trigger exists
    console.log('\n📋 Step 1: Checking trigger existence...');
    const { data: triggerData, error: triggerError } = await supabaseAdmin
      .from('information_schema.triggers')
      .select('*')
      .eq('trigger_name', 'on_auth_user_created');

    if (triggerError) {
      console.error('❌ Trigger check failed:', triggerError.message);
    } else {
      console.log('✅ Trigger data:', triggerData);
    }

    // Step 2: Check if function exists
    console.log('\n🔧 Step 2: Checking function existence...');
    const { data: functionData, error: functionError } = await supabaseAdmin
      .from('information_schema.routines')
      .select('*')
      .eq('routine_name', 'handle_new_user');

    if (functionError) {
      console.error('❌ Function check failed:', functionError.message);
    } else {
      console.log('✅ Function data:', functionData);
    }

    // Step 3: Test manual profile creation
    console.log('\n👤 Step 3: Testing manual profile creation...');
    const testUserId = 'test-user-' + Date.now();
    
    try {
      const { data: insertData, error: insertError } = await supabaseAdmin
        .from('users')
        .insert({
          auth_user_id: testUserId,
          full_name: 'Test User',
          username: 'testuser',
          phone_number: '+923001234567',
          vip_level: 'Intern',
          trial_start_date: new Date().toISOString().split('T')[0],
          trial_end_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        });

      if (insertError) {
        console.error('❌ Manual profile creation failed:', insertError.message);
      } else {
        console.log('✅ Manual profile creation successful');
        
        // Clean up test user
        await supabaseAdmin
          .from('users')
          .delete()
          .eq('auth_user_id', testUserId);
        console.log('✅ Test user cleaned up');
      }
    } catch (err) {
      console.error('❌ Manual profile creation error:', err.message);
    }

    // Step 4: Check auth.users table access
    console.log('\n🔐 Step 4: Testing auth.users access...');
    try {
      const { data: authData, error: authError } = await supabaseAdmin
        .from('auth.users')
        .select('id, email')
        .limit(1);

      if (authError) {
        console.error('❌ Auth users access failed:', authError.message);
      } else {
        console.log('✅ Auth users accessible, count:', authData?.length || 0);
      }
    } catch (err) {
      console.error('❌ Auth users access error:', err.message);
    }

    // Step 5: Test actual signup to see detailed error
    console.log('\n📝 Step 5: Testing actual signup with error details...');
    const supabase = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY);
    const testEmail = `trigger_test_${Date.now()}@example.com`;
    
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: 'TestPassword123!',
    });

    if (signUpError) {
      console.error('❌ Signup error details:');
      console.error('   Message:', signUpError.message);
      console.error('   Code:', signUpError.code);
      console.error('   Status:', signUpError.status);
      
      // Check if user was created in auth but not in users table
      if (signUpData?.user?.id) {
        console.log('🔍 User created in auth.users:', signUpData.user.id);
        
        // Check if profile exists
        const { data: profileData, error: profileError } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('auth_user_id', signUpData.user.id);
          
        if (profileError) {
          console.error('❌ Profile check failed:', profileError.message);
        } else {
          console.log('📊 Profile data:', profileData);
        }
      }
    } else {
      console.log('✅ Signup successful!');
      console.log('   User ID:', signUpData.user?.id);
      console.log('   Email:', signUpData.user?.email);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }

  console.log('\n' + '='.repeat(50));
  console.log('🏁 Trigger function test completed');
}

testTriggerFunction().catch(console.error);