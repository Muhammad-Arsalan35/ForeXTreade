const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://woiccythjszfhbypacaa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvaWNjeXRoanN6ZmhieXBhY2FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0ODIzNDYsImV4cCI6MjA3NDA1ODM0Nn0.TkSPiZDpS4wFORklYUEiOIhy3E5Q41-XTMj1btQKe_k'
);

async function emergencyDiagnosis() {
  console.log('🚨 EMERGENCY SIGNUP DIAGNOSIS 🚨\n');
  
  try {
    // 1. Check if trigger function exists
    console.log('1. Checking trigger function...');
    const { data: functions, error: funcError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          p.proname as function_name,
          p.prosrc as function_body
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
        AND p.proname = 'create_user_profile_from_auth';
      `
    });
    
    if (funcError) {
      console.log('❌ Cannot check trigger function:', funcError.message);
    } else if (!functions || functions.length === 0) {
      console.log('❌ CRITICAL: Trigger function does not exist!');
    } else {
      console.log('✅ Trigger function exists');
    }
    
    // 2. Check if trigger is active
    console.log('\n2. Checking trigger status...');
    const { data: triggers, error: trigError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          t.tgname as trigger_name,
          t.tgenabled as enabled,
          c.relname as table_name
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        WHERE t.tgname = 'on_auth_user_created';
      `
    });
    
    if (trigError) {
      console.log('❌ Cannot check trigger:', trigError.message);
    } else if (!triggers || triggers.length === 0) {
      console.log('❌ CRITICAL: Trigger does not exist!');
    } else {
      console.log('✅ Trigger exists and is enabled:', triggers[0].enabled);
    }
    
    // 3. Check table structures
    console.log('\n3. Checking table structures...');
    
    // Check users table
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (usersError) {
      console.log('❌ Users table issue:', usersError.message);
    } else {
      console.log('✅ Users table accessible');
      if (usersData.length > 0) {
        console.log('   Columns:', Object.keys(usersData[0]).join(', '));
      }
    }
    
    // Check user_profiles table
    const { data: profilesData, error: profilesError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1);
    
    if (profilesError) {
      console.log('❌ User_profiles table issue:', profilesError.message);
    } else {
      console.log('✅ User_profiles table accessible');
      if (profilesData.length > 0) {
        console.log('   Columns:', Object.keys(profilesData[0]).join(', '));
      }
    }
    
    // 4. Check recent auth.users entries
    console.log('\n4. Checking recent auth users...');
    const { data: authUsers, error: authError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          id,
          email,
          created_at,
          email_confirmed_at
        FROM auth.users 
        ORDER BY created_at DESC 
        LIMIT 5;
      `
    });
    
    if (authError) {
      console.log('❌ Cannot check auth.users:', authError.message);
    } else {
      console.log('✅ Recent auth users:');
      authUsers.forEach(user => {
        console.log(`   ${user.email} - ${user.created_at} - Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
      });
    }
    
    // 5. Check for orphaned auth users (users without profiles)
    console.log('\n5. Checking for orphaned users...');
    const { data: orphans, error: orphanError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          au.id,
          au.email,
          au.created_at
        FROM auth.users au
        LEFT JOIN public.user_profiles up ON up.user_id = au.id
        WHERE up.user_id IS NULL
        ORDER BY au.created_at DESC
        LIMIT 10;
      `
    });
    
    if (orphanError) {
      console.log('❌ Cannot check orphaned users:', orphanError.message);
    } else if (orphans && orphans.length > 0) {
      console.log('❌ FOUND ORPHANED USERS (auth users without profiles):');
      orphans.forEach(user => {
        console.log(`   ${user.email} - ${user.created_at}`);
      });
    } else {
      console.log('✅ No orphaned users found');
    }
    
    // 6. Test trigger manually
    console.log('\n6. Testing trigger manually...');
    try {
      const testEmail = `test_${Date.now()}@example.com`;
      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email: testEmail,
        password: 'TestPassword123!'
      });
      
      if (signupError) {
        console.log('❌ Signup test failed:', signupError.message);
      } else {
        console.log('✅ Signup test successful');
        
        // Wait a moment for trigger to execute
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check if profile was created
        const { data: testProfile, error: profileCheckError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', signupData.user.id);
        
        if (profileCheckError) {
          console.log('❌ Profile check failed:', profileCheckError.message);
        } else if (!testProfile || testProfile.length === 0) {
          console.log('❌ CRITICAL: Profile was NOT created by trigger!');
        } else {
          console.log('✅ Profile created successfully:', testProfile[0].username);
        }
      }
    } catch (testError) {
      console.log('❌ Manual test error:', testError.message);
    }
    
  } catch (error) {
    console.error('❌ Emergency diagnosis failed:', error.message);
  }
}

emergencyDiagnosis().catch(console.error);