require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function testTriggerManually() {
  console.log('🔧 Testing trigger manually...\n');

  try {
    // 1. Find auth user without user record
    console.log('1. Finding auth user without user record...');
    
    // Get all auth users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
      console.log('❌ Error getting auth users:', authError.message);
      return;
    }

    // Get all public users
    const { data: publicUsers, error: publicError } = await supabase
      .from('users')
      .select('auth_user_id');
    
    if (publicError) {
      console.log('❌ Error getting public users:', publicError.message);
      return;
    }

    // Find auth users without public user records
    const publicUserIds = new Set(publicUsers.map(u => u.auth_user_id));
    const missingUsers = authUsers.users.filter(au => !publicUserIds.has(au.id));

    if (missingUsers.length > 0) {
      const missingUser = missingUsers[0]; // Use missingUsers instead of missingUserData
      console.log('✅ Found auth user without user record:');
      console.log(`   Email: ${missingUser.email}`);
      console.log(`   Auth ID: ${missingUser.id}`);
      console.log(`   Created: ${missingUser.created_at}`);

      // 2. Try to manually create the user record
      console.log('\n2. Manually creating user record...');
      
      try {
        // Generate unique username
        const timestamp = Date.now();
        const microseconds = process.hrtime.bigint() % 1000000n;
        const randomSuffix = Math.floor(Math.random() * 10000);
        const username = `user_${timestamp}_${microseconds}_${randomSuffix}`;

        // Create user record
        const { data: userData, error: userError } = await supabase
          .from('users')
          .insert({
            auth_user_id: missingUser.id,
            full_name: missingUser.user_metadata?.full_name || '',
            username: username,
            phone_number: missingUser.user_metadata?.phone_number || '',
            profile_avatar: '',
            vip_level: 'intern',
            position_title: 'Member',
            user_status: 'active',
            income_wallet_balance: 0.00,
            personal_wallet_balance: 0.00,
            total_earnings: 0.00,
            total_invested: 0.00,
            referral_code: missingUser.id.substring(0, 8).toUpperCase(),
            referred_by: null,
            referral_level: 1,
            two_factor_enabled: false,
            two_factor_secret: null,
            last_login: new Date().toISOString(),
            login_attempts: 0,
            account_locked_until: null
          })
          .select()
          .single();

        if (userError) {
          console.log('❌ Error creating user:', userError.message);
        } else {
          console.log('✅ User created successfully:', userData.id);

          // Create user profile
          const { data: profileData, error: profileError } = await supabase
            .from('user_profiles')
            .insert({
              user_id: userData.id,
              full_name: missingUser.user_metadata?.full_name || '',
              username: username,
              phone_number: missingUser.user_metadata?.phone_number || '',
              membership_type: 'intern',
              membership_level: 1,
              intern_trial_start_date: new Date().toISOString(),
              intern_trial_end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              intern_trial_expired: false,
              days_remaining: 7,
              videos_watched_today: 0,
              last_video_reset_date: new Date().toISOString(),
              total_earnings: 0.00,
              income_wallet_balance: 0.00,
              personal_wallet_balance: 0.00,
              daily_earning_limit: 100.00,
              daily_earnings_today: 0.00,
              last_earning_reset_date: new Date().toISOString()
            })
            .select()
            .single();

          if (profileError) {
            console.log('❌ Error creating profile:', profileError.message);
          } else {
            console.log('✅ Profile created successfully:', profileData.id);
          }
        }
      } catch (error) {
        console.log('❌ Manual creation error:', error.message);
      }
    } else {
      console.log('✅ No auth users found without user records');
    }

    // 3. Final verification
    console.log('\n3. Final verification...');
    
    // Get updated counts
    const { data: updatedAuthUsers } = await supabase.auth.admin.listUsers();
    const { data: updatedPublicUsers } = await supabase.from('users').select('auth_user_id');
    const { data: updatedProfiles } = await supabase.from('user_profiles').select('user_id');

    console.log(`   Auth users: ${updatedAuthUsers?.users?.length || 'unknown'}`);
    console.log(`   Public users: ${updatedPublicUsers?.length || 'unknown'}`);
    console.log(`   User profiles: ${updatedProfiles?.length || 'unknown'}`);

    // Check for remaining missing records
    const updatedPublicUserIds = new Set(updatedPublicUsers?.map(u => u.auth_user_id) || []);
    const remainingMissing = updatedAuthUsers?.users?.filter(au => !updatedPublicUserIds.has(au.id)) || [];

    console.log(`   Remaining missing: ${remainingMissing.length}`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testTriggerManually();