const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function simpleDiagnosis() {
  console.log('🔍 SIMPLE DATABASE DIAGNOSIS 🔍\n');

  try {
    // 1. Check if tables exist by trying to query them
    console.log('1. Checking if tables exist...');
    
    try {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id')
        .limit(1);
      
      if (usersError) {
        console.log('❌ users table issue:', usersError.message);
      } else {
        console.log('✅ users table exists');
      }
    } catch (err) {
      console.log('❌ users table error:', err.message);
    }

    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id')
        .limit(1);
      
      if (profilesError) {
        console.log('❌ user_profiles table issue:', profilesError.message);
      } else {
        console.log('✅ user_profiles table exists');
      }
    } catch (err) {
      console.log('❌ user_profiles table error:', err.message);
    }

    // 2. Check current counts
    console.log('\n2. Checking current data counts...');
    
    const { count: userCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    const { count: profileCount } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true });

    console.log(`✅ Users count: ${userCount || 0}`);
    console.log(`✅ User profiles count: ${profileCount || 0}`);

    // 3. Check auth users
    console.log('\n3. Checking auth users...');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.log('❌ Cannot check auth users:', authError.message);
    } else {
      console.log(`✅ Auth users count: ${authUsers.users.length}`);
      if (authUsers.users.length > 0) {
        console.log('   Sample auth user ID:', authUsers.users[0].id);
      }
    }

    // 4. Test the actual signup process
    console.log('\n4. Testing signup process...');
    const testEmail = `diagnosis_${Date.now()}@forextrade.com`;
    
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: testEmail,
      password: 'TestPass123!',
      options: {
        data: {
          full_name: 'Diagnosis Test User',
          phone_number: '1234567890'
        }
      }
    });

    if (signupError) {
      console.log('❌ Signup failed:', signupError.message);
      
      if (signupError.message.includes('Database error saving new user')) {
        console.log('🔍 This is the trigger error we need to fix');
        console.log('🔧 The trigger function is not working properly');
      }
    } else {
      console.log('✅ Signup succeeded!');
      console.log('   User ID:', signupData.user?.id);
      
      // Check if user record was created
      if (signupData.user) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('auth_user_id', signupData.user.id)
          .single();

        if (userError) {
          console.log('❌ User record not found:', userError.message);
        } else {
          console.log('✅ User record created:', userData.username);
        }

        // Check if user profile was created
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userData?.id)
          .single();

        if (profileError) {
          console.log('❌ User profile not found:', profileError.message);
        } else {
          console.log('✅ User profile created:', profileData.username);
        }

        // Clean up test user
        await supabase.auth.admin.deleteUser(signupData.user.id);
        console.log('✅ Test user cleaned up');
      }
    }

    // 5. Check if we can create a user profile manually
    console.log('\n5. Testing manual user profile creation...');
    
    // First, let's see if we have any users to work with
    const { data: existingUsers } = await supabase
      .from('users')
      .select('id, username')
      .limit(1);

    if (existingUsers && existingUsers.length > 0) {
      console.log('✅ Found existing user to test with');
      
      // Try to create a profile for this user
      const testProfileData = {
        user_id: existingUsers[0].id,
        full_name: 'Manual Test Profile',
        username: `manual_test_${Date.now()}`,
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
      };

      const { data: manualProfile, error: manualError } = await supabase
        .from('user_profiles')
        .insert(testProfileData)
        .select()
        .single();

      if (manualError) {
        console.log('❌ Manual profile creation failed:', manualError.message);
      } else {
        console.log('✅ Manual profile creation succeeded');
        
        // Clean up
        await supabase
          .from('user_profiles')
          .delete()
          .eq('id', manualProfile.id);
        console.log('✅ Test profile cleaned up');
      }
    } else {
      console.log('❌ No existing users found to test with');
    }

  } catch (error) {
    console.log('❌ Diagnosis failed:', error.message);
  }

  console.log('\n🏁 DIAGNOSIS COMPLETE 🏁');
  console.log('📋 Check the output above to identify the specific issues');
}

simpleDiagnosis();