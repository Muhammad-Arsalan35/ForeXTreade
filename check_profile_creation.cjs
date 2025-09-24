require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function checkProfileCreation() {
  console.log('🔍 CHECKING PROFILE CREATION ISSUE...\n');

  try {
    // Get the most recent user
    console.log('1. Getting most recent user...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (usersError) {
      console.log('❌ Error getting users:', usersError.message);
      return;
    }

    if (!users || users.length === 0) {
      console.log('❌ No users found');
      return;
    }

    const latestUser = users[0];
    console.log('✅ Latest user found:');
    console.log('   ID:', latestUser.id);
    console.log('   Auth User ID:', latestUser.auth_user_id);
    console.log('   Username:', latestUser.username);
    console.log('   Created:', latestUser.created_at);

    // Check for corresponding user profile
    console.log('\n2. Checking for user profile...');
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', latestUser.id);

    if (profilesError) {
      console.log('❌ Error getting user profiles:', profilesError.message);
      return;
    }

    if (!profiles || profiles.length === 0) {
      console.log('❌ NO USER PROFILE FOUND for user ID:', latestUser.id);
      
      // Check if there are any profiles at all
      console.log('\n3. Checking all user profiles...');
      const { data: allProfiles, error: allProfilesError } = await supabase
        .from('user_profiles')
        .select('id, user_id, username, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      if (allProfilesError) {
        console.log('❌ Error getting all profiles:', allProfilesError.message);
      } else {
        console.log('📊 Recent user profiles:');
        allProfiles.forEach(profile => {
          console.log(`   - ID: ${profile.id}, User ID: ${profile.user_id}, Username: ${profile.username}`);
        });
      }
    } else {
      console.log('✅ User profile found:');
      profiles.forEach(profile => {
        console.log('   ID:', profile.id);
        console.log('   User ID:', profile.user_id);
        console.log('   Username:', profile.username);
        console.log('   Membership Level:', profile.membership_level);
        console.log('   Created:', profile.created_at);
      });
    }

    // Check trigger status
    console.log('\n4. Checking trigger status...');
    const { data: triggerCheck, error: triggerError } = await supabase
      .rpc('sql', {
        query: `
          SELECT 
            t.tgname as trigger_name,
            CASE t.tgenabled 
              WHEN 'O' THEN 'enabled' 
              WHEN 'D' THEN 'disabled' 
              ELSE 'unknown' 
            END as status
          FROM pg_trigger t 
          WHERE t.tgname = 'on_auth_user_created';
        `
      });

    if (triggerError) {
      console.log('❌ Error checking trigger:', triggerError.message);
    } else {
      console.log('✅ Trigger status:', triggerCheck);
    }

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

checkProfileCreation();