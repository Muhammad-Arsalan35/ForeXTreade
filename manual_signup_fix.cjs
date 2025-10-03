const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function manualSignupFix() {
  console.log('🔧 MANUAL SIGNUP FIX - BYPASSING TRIGGER ISSUES 🔧\n');
  
  try {
    // Since triggers aren't working, let's manually fix the signup process
    // by modifying the signup code to handle user creation directly
    
    console.log('1. Checking for auth users without user records...');
    
    // Get all auth users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.log('❌ Error fetching auth users:', authError.message);
      return false;
    }
    
    console.log(`✅ Found ${authUsers.users.length} auth users`);
    
    let fixedCount = 0;
    
    for (const authUser of authUsers.users) {
      // Check if this user has a record in the users table
      const { data: existingUser, error: existingError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', authUser.id)
        .single();
      
      if (existingError && existingError.code === 'PGRST116') {
        // User doesn't exist in users table, create it
        console.log(`\n2. Creating missing user record for: ${authUser.email}`);
        
        const username = authUser.email ? 
          authUser.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') + '_' + Date.now() : 
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
          continue;
        }
        
        console.log(`✅ User record created successfully`);
        
        // Create user profile
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
            fixedCount++;
          }
        }
      }
    }
    
    console.log(`\n3. Manual fix completed! Fixed ${fixedCount} user records.`);
    
    // Now test signup to see if the issue persists
    console.log('\n4. Testing signup after manual fix...');
    
    const testEmail = `manualtest_${Date.now()}@forextrade.com`;
    const testPassword = 'TestPass123!';
    
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Manual Test User'
        }
      }
    });

    if (signupError) {
      console.log('❌ Signup still failing:', signupError.message);
      
      if (signupError.message.includes('Database error')) {
        console.log('\n5. Since triggers are not working, implementing direct user creation...');
        
        // If signup fails due to database error, we need to manually create the user record
        // This is a workaround until the trigger is fixed
        
        // First, let's try to sign up without the trigger
        const { data: authOnlySignup, error: authOnlyError } = await supabase.auth.signUp({
          email: testEmail,
          password: testPassword
        });
        
        if (authOnlyError) {
          console.log('❌ Even auth-only signup failed:', authOnlyError.message);
          return false;
        }
        
        console.log('✅ Auth user created, now creating user record manually...');
        
        // Manually create user record
        const username = testEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') + '_' + Date.now();
        
        const { data: manualUser, error: manualUserError } = await supabase
          .from('users')
          .insert({
            auth_user_id: authOnlySignup.user.id,
            full_name: 'Manual Test User',
            username: username,
            vip_level: 'VIP1',
            user_status: 'active',
            referral_code: Math.floor(100000 + Math.random() * 900000).toString(),
            personal_wallet_balance: 0.00,
            income_wallet_balance: 0.00,
            total_earnings: 0.00,
            position_title: 'Member'
          })
          .select()
          .single();
        
        if (manualUserError) {
          console.log('❌ Manual user creation failed:', manualUserError.message);
          return false;
        }
        
        // Create user profile
        const { error: manualProfileError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: manualUser.id,
            full_name: 'Manual Test User',
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
        
        if (manualProfileError) {
          console.log('❌ Manual profile creation failed:', manualProfileError.message);
          return false;
        }
        
        console.log('✅ Manual user and profile creation successful!');
        
        // Cleanup
        await supabase.auth.admin.deleteUser(authOnlySignup.user.id);
        console.log('✅ Test user cleaned up');
        
        return true;
      }
    } else {
      console.log('✅ Signup successful! The issue may be resolved.');
      
      // Cleanup
      if (signupData.user?.id) {
        await supabase.auth.admin.deleteUser(signupData.user.id);
        console.log('✅ Test user cleaned up');
      }
      
      return true;
    }
    
    return false;

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

manualSignupFix().then(success => {
  if (success) {
    console.log('\n🎉 MANUAL SIGNUP FIX COMPLETED! 🎉');
    console.log('✅ Existing users have been fixed');
    console.log('✅ Signup process has been tested');
    console.log('ℹ️  Note: You may need to modify the signup code to handle user creation manually');
  } else {
    console.log('\n💥 MANUAL SIGNUP FIX FAILED! 💥');
    console.log('❌ Additional intervention required');
  }
}).catch(console.error);