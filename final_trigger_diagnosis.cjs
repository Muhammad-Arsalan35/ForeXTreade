const { createClient } = require('@supabase/supabase-js');

// Use service role key for admin access
const supabase = createClient(
  'https://woiccythjszfhbypacaa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvaWNjeXRoanN6ZmhieXBhY2FhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQ4MjM0NiwiZXhwIjoyMDc0MDU4MzQ2fQ.F1_wsNmySrDhGlstpi3HbAZFWuzFioeGWYTdYA6zlU0'
);

async function diagnoseTriggerIssue() {
  console.log('🔍 FINAL TRIGGER DIAGNOSIS & FIX 🔍\n');
  
  try {
    // 1. Check if trigger function exists
    console.log('1. Checking if trigger function exists...');
    const { data: functions, error: funcError } = await supabase
      .from('pg_proc')
      .select('proname')
      .eq('proname', 'create_user_profile_from_auth');
    
    if (funcError) {
      console.log('❌ Cannot check functions:', funcError.message);
    } else if (!functions || functions.length === 0) {
      console.log('❌ CRITICAL: Trigger function does NOT exist!');
    } else {
      console.log('✅ Trigger function exists');
    }
    
    // 2. Check if trigger exists
    console.log('\n2. Checking if trigger exists...');
    const { data: triggers, error: trigError } = await supabase
      .from('pg_trigger')
      .select('tgname')
      .eq('tgname', 'on_auth_user_created');
    
    if (trigError) {
      console.log('❌ Cannot check triggers:', trigError.message);
    } else if (!triggers || triggers.length === 0) {
      console.log('❌ CRITICAL: Trigger does NOT exist!');
    } else {
      console.log('✅ Trigger exists');
    }
    
    // 3. Check recent auth users vs profiles
    console.log('\n3. Checking for orphaned auth users...');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.log('❌ Cannot check auth users:', authError.message);
    } else {
      console.log(`✅ Found ${authUsers.users.length} auth users`);
      
      // Check how many have profiles
      let orphanCount = 0;
      for (const user of authUsers.users.slice(0, 5)) { // Check first 5
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();
        
        if (profileError || !profile) {
          orphanCount++;
          console.log(`   ❌ User ${user.email} has NO profile`);
        }
      }
      
      if (orphanCount > 0) {
        console.log(`❌ FOUND ${orphanCount} users without profiles!`);
      } else {
        console.log('✅ All checked users have profiles');
      }
    }
    
    // 4. Now let's create the working trigger
    console.log('\n4. Creating the working trigger function...');
    
    const triggerSQL = `
      CREATE OR REPLACE FUNCTION public.create_user_profile_from_auth()
      RETURNS TRIGGER
      SECURITY DEFINER
      SET search_path = public
      LANGUAGE plpgsql
      AS $$
      DECLARE
          new_username TEXT;
          user_record_id UUID;
      BEGIN
          -- Generate unique username
          new_username := 'user_' || EXTRACT(epoch FROM NOW())::bigint || '_' || (RANDOM() * 1000000)::bigint;

          -- Insert into users table
          INSERT INTO public.users (
              id, auth_id, auth_user_id, full_name, username, vip_level, 
              position_title, total_earnings, referral_code, created_at, updated_at
          ) VALUES (
              gen_random_uuid(), NEW.id, NEW.id,
              COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
              new_username, 'trial', 'Member', 0,
              upper(substring(md5(random()::text) from 1 for 8)),
              NOW(), NOW()
          ) RETURNING id INTO user_record_id;

          -- Insert into user_profiles table
          INSERT INTO public.user_profiles (
              id, user_id, full_name, username, vip_level, membership_type,
              total_earnings, income_wallet_balance, personal_wallet_balance,
              daily_earning_limit, daily_earnings_today, videos_watched_today,
              created_at, updated_at
          ) VALUES (
              gen_random_uuid(), user_record_id,
              COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
              new_username, 'trial', 'trial', 0, 0, 0, 100, 0, 0, NOW(), NOW()
          );

          RETURN NEW;
      EXCEPTION
          WHEN OTHERS THEN
              RAISE LOG 'Error in create_user_profile_from_auth: %', SQLERRM;
              RAISE;
      END;
      $$;
    `;
    
    const { error: createFuncError } = await supabase.rpc('exec', { sql: triggerSQL });
    
    if (createFuncError) {
      console.log('❌ Failed to create function:', createFuncError.message);
      
      // Try alternative approach - direct SQL execution
      console.log('\n5. Trying direct SQL execution...');
      const { error: directError } = await supabase.rpc('sql', { query: triggerSQL });
      
      if (directError) {
        console.log('❌ Direct SQL also failed:', directError.message);
        console.log('\n🚨 MANUAL ACTION REQUIRED:');
        console.log('Please run the SQL commands manually in Supabase SQL Editor:');
        console.log('\n' + triggerSQL);
      } else {
        console.log('✅ Function created via direct SQL');
      }
    } else {
      console.log('✅ Trigger function created successfully');
    }
    
    // 5. Create the trigger
    console.log('\n6. Creating the trigger...');
    const triggerCreateSQL = `
      DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
      CREATE TRIGGER on_auth_user_created
          AFTER INSERT ON auth.users
          FOR EACH ROW
          EXECUTE FUNCTION public.create_user_profile_from_auth();
    `;
    
    const { error: triggerCreateError } = await supabase.rpc('exec', { sql: triggerCreateSQL });
    
    if (triggerCreateError) {
      console.log('❌ Failed to create trigger:', triggerCreateError.message);
      console.log('\n🚨 MANUAL ACTION REQUIRED:');
      console.log('Please run this SQL in Supabase SQL Editor:');
      console.log('\n' + triggerCreateSQL);
    } else {
      console.log('✅ Trigger created successfully');
    }
    
    // 6. Test signup
    console.log('\n7. Testing signup after fix...');
    const testEmail = `test_${Date.now()}@example.com`;
    
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: testEmail,
      password: 'TestPassword123!',
      options: {
        data: { full_name: 'Test User' }
      }
    });
    
    if (signupError) {
      console.log('❌ Signup still failing:', signupError.message);
      console.log('\n🚨 CRITICAL: Manual intervention required!');
    } else {
      console.log('🎉 SUCCESS! Signup is now working!');
      console.log('   User created:', signupData.user?.email);
      
      // Wait and check if profile was created
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', signupData.user.id)
        .single();
      
      if (profile) {
        console.log('✅ Profile created automatically!');
        console.log('   Username:', profile.username);
        console.log('   VIP Level:', profile.vip_level);
      } else {
        console.log('❌ Profile not created:', profileError?.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Diagnosis failed:', error.message);
  }
}

diagnoseTriggerIssue().catch(console.error);