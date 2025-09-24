const { createClient } = require('@supabase/supabase-js');

// Use service role key for admin access
const supabase = createClient(
  'https://woiccythjszfhbypacaa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvaWNjeXRoanN6ZmhieXBhY2FhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQ4MjM0NiwiZXhwIjoyMDc0MDU4MzQ2fQ.F1_wsNmySrDhGlstpi3HbAZFWuzFioeGWYTdYA6zlU0'
);

async function verifyFixApplied() {
  console.log('🔍 VERIFYING SQL FIX WAS APPLIED 🔍\n');
  
  try {
    // 1. Check if trigger function exists and get its definition
    console.log('1. Checking trigger function...');
    const { data: functions, error: funcError } = await supabase
      .rpc('sql', { 
        query: `
          SELECT 
            proname, 
            prosrc,
            proowner,
            provolatile
          FROM pg_proc 
          WHERE proname = 'create_user_profile_from_auth';
        `
      });
    
    if (funcError) {
      console.log('❌ Cannot check function:', funcError.message);
    } else if (!functions || functions.length === 0) {
      console.log('❌ CRITICAL: Trigger function does NOT exist!');
      console.log('   The SQL script may not have been executed properly.');
    } else {
      console.log('✅ Trigger function exists');
      console.log('   Function name:', functions[0].proname);
      console.log('   Function owner:', functions[0].proowner);
      console.log('   Function source length:', functions[0].prosrc?.length || 0);
    }
    
    // 2. Check if trigger exists
    console.log('\n2. Checking trigger...');
    const { data: triggers, error: trigError } = await supabase
      .rpc('sql', { 
        query: `
          SELECT 
            tgname, 
            tgenabled,
            tgtype,
            tgfoid
          FROM pg_trigger 
          WHERE tgname = 'on_auth_user_created';
        `
      });
    
    if (trigError) {
      console.log('❌ Cannot check trigger:', trigError.message);
    } else if (!triggers || triggers.length === 0) {
      console.log('❌ CRITICAL: Trigger does NOT exist!');
      console.log('   The trigger creation may have failed.');
    } else {
      console.log('✅ Trigger exists');
      console.log('   Trigger name:', triggers[0].tgname);
      console.log('   Trigger enabled:', triggers[0].tgenabled === 'O' ? 'Yes' : 'No');
      console.log('   Trigger type:', triggers[0].tgtype);
    }
    
    // 3. Check table structures
    console.log('\n3. Checking table structures...');
    
    // Check users table
    const { data: usersColumns, error: usersError } = await supabase
      .rpc('sql', { 
        query: `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = 'users' AND table_schema = 'public'
          ORDER BY ordinal_position;
        `
      });
    
    if (usersError) {
      console.log('❌ Cannot check users table:', usersError.message);
    } else {
      console.log('✅ Users table structure:');
      usersColumns.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
      
      const hasVipLevel = usersColumns.some(col => col.column_name === 'vip_level');
      console.log(`   VIP level column: ${hasVipLevel ? '✅ Present' : '❌ Missing'}`);
    }
    
    // Check user_profiles table
    const { data: profilesColumns, error: profilesError } = await supabase
      .rpc('sql', { 
        query: `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = 'user_profiles' AND table_schema = 'public'
          ORDER BY ordinal_position;
        `
      });
    
    if (profilesError) {
      console.log('❌ Cannot check user_profiles table:', profilesError.message);
    } else {
      console.log('\n✅ User_profiles table structure:');
      profilesColumns.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
      
      const hasVipLevel = profilesColumns.some(col => col.column_name === 'vip_level');
      console.log(`   VIP level column: ${hasVipLevel ? '✅ Present' : '❌ Missing'}`);
    }
    
    // 4. Check RLS policies
    console.log('\n4. Checking RLS policies...');
    const { data: policies, error: policiesError } = await supabase
      .rpc('sql', { 
        query: `
          SELECT 
            schemaname,
            tablename,
            policyname,
            permissive,
            roles,
            cmd,
            qual,
            with_check
          FROM pg_policies 
          WHERE tablename IN ('users', 'user_profiles')
          ORDER BY tablename, policyname;
        `
      });
    
    if (policiesError) {
      console.log('❌ Cannot check policies:', policiesError.message);
    } else {
      console.log('✅ RLS Policies:');
      policies.forEach(policy => {
        console.log(`   - ${policy.tablename}.${policy.policyname} (${policy.cmd})`);
      });
    }
    
    // 5. Test trigger manually
    console.log('\n5. Testing trigger function manually...');
    const { data: testResult, error: testError } = await supabase
      .rpc('sql', { 
        query: `
          SELECT public.create_user_profile_from_auth() as test_result;
        `
      });
    
    if (testError) {
      console.log('❌ Cannot test trigger function:', testError.message);
      console.log('   This suggests the function has issues or doesn\'t exist');
    } else {
      console.log('✅ Trigger function can be called (but needs NEW record)');
    }
    
    // 6. Check recent auth.users entries
    console.log('\n6. Checking recent auth users...');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.log('❌ Cannot check auth users:', authError.message);
    } else {
      console.log(`✅ Found ${authUsers.users.length} total auth users`);
      
      // Check last few users for profiles
      const recentUsers = authUsers.users.slice(-3);
      for (const user of recentUsers) {
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('id, username, vip_level')
          .eq('user_id', user.id)
          .single();
        
        if (profileError) {
          console.log(`   ❌ User ${user.email} has NO profile`);
        } else {
          console.log(`   ✅ User ${user.email} has profile (${profile.username}, ${profile.vip_level})`);
        }
      }
    }
    
    console.log('\n📋 DIAGNOSIS SUMMARY:');
    console.log('====================');
    
    if (functions && functions.length > 0 && triggers && triggers.length > 0) {
      console.log('✅ Function and trigger exist - issue might be elsewhere');
      console.log('🔍 Possible causes:');
      console.log('   1. RLS policies blocking the trigger');
      console.log('   2. Missing permissions');
      console.log('   3. Function has a bug');
      console.log('   4. Table constraints failing');
    } else {
      console.log('❌ Function or trigger missing - SQL script not applied properly');
      console.log('🚨 ACTION REQUIRED: Re-run the SQL script in Supabase SQL Editor');
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  }
}

verifyFixApplied().catch(console.error);