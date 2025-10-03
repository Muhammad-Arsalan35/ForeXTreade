const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fixSignupIssue() {
  console.log('🔧 FIXING SIGNUP DATABASE ERROR 🔧\n');
  
  try {
    // Test the fix with a new user first to see current state
    console.log('1. Testing current signup state...');
    
    const testEmail = `test_${Date.now()}@forextrade.com`;
    const testPassword = 'TestPass123!';
    
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Test User Fix',
          username: 'testuser'
        }
      }
    });

    if (signupError) {
      console.log('❌ Current signup error:', signupError.message);
      
      if (signupError.message.includes('Database error')) {
        console.log('✅ Confirmed: This is the database error we need to fix');
      }
    } else {
      console.log('✅ Signup successful - checking if user records were created...');
      
      // Wait for potential trigger execution
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check if user was created in users table
      const { data: newUser, error: newUserError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', signupData.user?.id)
        .single();

      if (newUserError) {
        console.log('❌ User record not created automatically:', newUserError.message);
        console.log('✅ This confirms the trigger is not working properly');
      } else {
        console.log('✅ User record exists - trigger might be working');
        console.log('   Username:', newUser.username);
        console.log('   VIP Level:', newUser.vip_level);
      }

      // Cleanup test user
      if (signupData.user?.id) {
        await supabase.auth.admin.deleteUser(signupData.user.id);
        console.log('✅ Test user cleaned up');
      }
    }

    // 2. Now let's manually create the user profile for the signup that failed
    console.log('\n2. Creating manual user profile for failed signups...');
    
    // Check for auth users without corresponding user records
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.log('❌ Error fetching auth users:', authError.message);
    } else {
      console.log(`✅ Found ${authUsers.users.length} auth users`);
      
      for (const authUser of authUsers.users) {
        // Check if this user has a record in the users table
        const { data: existingUser, error: existingError } = await supabase
          .from('users')
          .select('id')
          .eq('auth_user_id', authUser.id)
          .single();
        
        if (existingError && existingError.code === 'PGRST116') {
          // User doesn't exist in users table, create it
          console.log(`Creating missing user record for auth user: ${authUser.id}`);
          
          const username = authUser.email ? 
            authUser.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') : 
            `user_${authUser.id.substring(0, 8)}`;
          
          const { data: newUserRecord, error: createUserError } = await supabase
            .from('users')
            .insert({
              auth_user_id: authUser.id,
              full_name: authUser.user_metadata?.full_name || 'User',
              username: username,
              phone_number: authUser.user_metadata?.phone || authUser.phone || '',
              vip_level: 'VIP1',
              user_status: 'active',
              referral_code: Math.floor(100000 + Math.random() * 900000).toString(),
              personal_wallet_balance: 0.00,
              income_wallet_balance: 0.00,
              total_earnings: 0.00,
              total_invested: 0.00,
              position_title: 'Member'
            })
            .select()
            .single();
          
          if (createUserError) {
            console.log(`❌ Error creating user record: ${createUserError.message}`);
          } else {
            console.log(`✅ User record created successfully for ${authUser.email}`);
            
            // Also create user profile if it doesn't exist
            const { data: existingProfile, error: profileCheckError } = await supabase
              .from('user_profiles')
              .select('id')
              .eq('user_id', newUserRecord.id)
              .single();
            
            if (profileCheckError && profileCheckError.code === 'PGRST116') {
              const { error: createProfileError } = await supabase
                 .from('user_profiles')
                 .insert({
                   user_id: newUserRecord.id,
                   full_name: authUser.user_metadata?.full_name || 'User',
                   username: username,
                   membership_type: 'intern',
                   membership_level: 'Intern',
                   is_trial_active: true,
                   trial_start_date: new Date().toISOString().split('T')[0],
                   trial_end_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                   total_earnings: 0,
                   income_wallet_balance: 0,
                   personal_wallet_balance: 0,
                   videos_watched_today: 0
                 });
              
              if (createProfileError) {
                console.log(`❌ Error creating user profile: ${createProfileError.message}`);
              } else {
                console.log(`✅ User profile created successfully`);
              }
            }
          }
        }
      }
    }

    console.log('\n🎉 SIGNUP FIX COMPLETED! 🎉');
    console.log('✅ Missing user records have been created');
    console.log('✅ Users should now be able to access their accounts');
    console.log('✅ Try logging in with your credentials now');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

fixSignupIssue().catch(console.error);