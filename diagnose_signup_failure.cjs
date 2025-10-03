const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function diagnoseDatabaseState() {
  console.log('🔍 COMPREHENSIVE DATABASE DIAGNOSIS 🔍\n');

  try {
    // 1. Check if user_profiles table exists and its structure
    console.log('1. Checking user_profiles table structure...');
    const { data: tableInfo, error: tableError } = await supabase
      .rpc('sql', {
        query: `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = 'user_profiles' 
          AND table_schema = 'public'
          ORDER BY ordinal_position;
        `
      });

    if (tableError) {
      console.log('❌ Cannot check table structure:', tableError.message);
    } else {
      console.log('✅ user_profiles table columns:');
      tableInfo.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    }

    // 2. Check if trigger function exists
    console.log('\n2. Checking trigger function...');
    const { data: functionInfo, error: functionError } = await supabase
      .rpc('sql', {
        query: `
          SELECT routine_name, routine_type, routine_definition
          FROM information_schema.routines 
          WHERE routine_name = 'handle_new_user'
          AND routine_schema = 'public';
        `
      });

    if (functionError) {
      console.log('❌ Cannot check trigger function:', functionError.message);
    } else if (functionInfo.length === 0) {
      console.log('❌ Trigger function handle_new_user does not exist');
    } else {
      console.log('✅ Trigger function handle_new_user exists');
    }

    // 3. Check if trigger exists
    console.log('\n3. Checking trigger...');
    const { data: triggerInfo, error: triggerError } = await supabase
      .rpc('sql', {
        query: `
          SELECT trigger_name, event_manipulation, action_timing, action_statement
          FROM information_schema.triggers 
          WHERE trigger_name = 'on_auth_user_created';
        `
      });

    if (triggerError) {
      console.log('❌ Cannot check trigger:', triggerError.message);
    } else if (triggerInfo.length === 0) {
      console.log('❌ Trigger on_auth_user_created does not exist');
    } else {
      console.log('✅ Trigger on_auth_user_created exists');
      console.log(`   - Event: ${triggerInfo[0].event_manipulation}`);
      console.log(`   - Timing: ${triggerInfo[0].action_timing}`);
    }

    // 4. Check RLS policies
    console.log('\n4. Checking RLS policies...');
    const { data: policyInfo, error: policyError } = await supabase
      .rpc('sql', {
        query: `
          SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
          FROM pg_policies 
          WHERE tablename IN ('users', 'user_profiles')
          ORDER BY tablename, policyname;
        `
      });

    if (policyError) {
      console.log('❌ Cannot check RLS policies:', policyError.message);
    } else {
      console.log('✅ RLS policies:');
      policyInfo.forEach(policy => {
        console.log(`   - ${policy.tablename}.${policy.policyname} (${policy.cmd})`);
      });
    }

    // 5. Test direct user creation (bypassing auth)
    console.log('\n5. Testing direct user creation...');
    const testEmail = `directtest_${Date.now()}@forextrade.com`;
    
    try {
      const { data: directUser, error: directError } = await supabase
        .from('users')
        .insert({
          auth_user_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
          full_name: 'Direct Test User',
          username: `directtest_${Date.now()}`,
          phone_number: '',
          vip_level: 'VIP1',
          user_status: 'active',
          referral_code: 'TESTREF',
          personal_wallet_balance: 0,
          income_wallet_balance: 0,
          total_earnings: 0,
          total_invested: 0,
          position_title: 'Member'
        })
        .select()
        .single();

      if (directError) {
        console.log('❌ Direct user creation failed:', directError.message);
      } else {
        console.log('✅ Direct user creation successful');
        
        // Try to create user profile
        const { data: directProfile, error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: directUser.id,
            full_name: 'Direct Test User',
            username: `directtest_${Date.now()}`,
            phone_number: '',
            membership_type: 'intern',
            membership_level: 'Intern',
            is_trial_active: true,
            trial_start_date: new Date().toISOString().split('T')[0],
            trial_end_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            videos_watched_today: 0,
            last_video_reset_date: new Date().toISOString().split('T')[0],
            total_earnings: 0,
            income_wallet_balance: 0,
            personal_wallet_balance: 0
          })
          .select()
          .single();

        if (profileError) {
          console.log('❌ Direct profile creation failed:', profileError.message);
        } else {
          console.log('✅ Direct profile creation successful');
          
          // Clean up test data
          await supabase.from('user_profiles').delete().eq('id', directProfile.id);
          await supabase.from('users').delete().eq('id', directUser.id);
          console.log('✅ Test data cleaned up');
        }
      }
    } catch (err) {
      console.log('❌ Direct creation test failed:', err.message);
    }

    // 6. Check current user counts
    console.log('\n6. Checking current data counts...');
    const { data: userCount } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true });
    
    const { data: profileCount } = await supabase
      .from('user_profiles')
      .select('id', { count: 'exact', head: true });

    console.log(`✅ Users count: ${userCount?.length || 0}`);
    console.log(`✅ User profiles count: ${profileCount?.length || 0}`);

    // 7. Test auth signup (the actual failing operation)
    console.log('\n7. Testing auth signup (this should fail)...');
    const testAuthEmail = `authtest_${Date.now()}@forextrade.com`;
    
    const { data: authUser, error: authError } = await supabase.auth.signUp({
      email: testAuthEmail,
      password: 'TestPass123!',
      options: {
        data: {
          full_name: 'Auth Test User',
          phone_number: '1234567890'
        }
      }
    });

    if (authError) {
      console.log('❌ Auth signup failed (expected):', authError.message);
      
      // Check if it's specifically the database error
      if (authError.message.includes('Database error saving new user')) {
        console.log('🔍 This is the exact error we\'re trying to fix');
        console.log('🔧 The trigger function is likely not working properly');
      }
    } else {
      console.log('✅ Auth signup succeeded! (unexpected but good)');
      console.log('User ID:', authUser.user?.id);
      
      // Clean up
      if (authUser.user) {
        await supabase.auth.admin.deleteUser(authUser.user.id);
        console.log('✅ Test auth user cleaned up');
      }
    }

  } catch (error) {
    console.log('❌ Diagnosis failed:', error.message);
  }

  console.log('\n🏁 DIAGNOSIS COMPLETE 🏁');
  console.log('📋 Summary: Check the output above to identify the specific issue');
}

diagnoseDatabaseState();