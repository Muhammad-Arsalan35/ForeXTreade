require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCurrentState() {
  console.log('📊 Checking Current Database State...\n');
  
  try {
    // Count users
    const { count: userCount, error: userError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    if (userError) {
      console.log('❌ Error counting users:', userError);
    } else {
      console.log(`✅ Total users: ${userCount}`);
    }
    
    // Count user profiles
    const { count: profileCount, error: profileError } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true });
    
    if (profileError) {
      console.log('❌ Error counting profiles:', profileError);
    } else {
      console.log(`✅ Total user profiles: ${profileCount}`);
    }
    
    // Get sample users and their profiles
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, username, full_name')
      .limit(5);
    
    if (usersError) {
      console.log('❌ Error fetching users:', usersError);
      return;
    }
    
    console.log('\n📋 Sample Users and Their Profiles:');
    for (const user of users) {
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('membership_type, membership_level')
        .eq('user_id', user.id)
        .single();
      
      if (profileError) {
        console.log(`❌ ${user.username}: No profile found`);
      } else {
        console.log(`✅ ${user.username}: ${profile.membership_type} (${profile.membership_level})`);
      }
    }
    
    // Check if there are any users without profiles
    const { data: usersWithoutProfiles, error: orphanError } = await supabase
      .from('users')
      .select('id, username')
      .not('id', 'in', `(SELECT user_id FROM user_profiles WHERE user_id IS NOT NULL)`);
    
    if (orphanError) {
      console.log('\n❌ Error checking for users without profiles:', orphanError);
    } else {
      console.log(`\n📊 Users without profiles: ${usersWithoutProfiles.length}`);
      if (usersWithoutProfiles.length > 0) {
        console.log('   Users missing profiles:');
        usersWithoutProfiles.forEach(user => {
          console.log(`   - ${user.username} (${user.id})`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkCurrentState();