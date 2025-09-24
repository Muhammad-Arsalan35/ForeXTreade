const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkTriggerStatus() {
  console.log('🔍 Checking trigger status and database records...\n');

  try {
    // Check if trigger exists
    console.log('1. Checking if trigger exists...');
    const { data: triggers, error: triggerError } = await supabase
      .from('information_schema.triggers')
      .select('*')
      .eq('trigger_name', 'on_auth_user_created');

    if (triggerError) {
      console.log('❌ Error checking triggers:', triggerError.message);
    } else {
      console.log(`✅ Found ${triggers?.length || 0} triggers named 'on_auth_user_created'`);
    }

    // Check users table
    console.log('\n2. Checking users table...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (usersError) {
      console.log('❌ Error fetching users:', usersError.message);
    } else {
      console.log(`✅ Found ${users?.length || 0} users in users table`);
      if (users && users.length > 0) {
        console.log('   Latest users:');
        users.forEach(user => {
          console.log(`   - ID: ${user.id}, Auth ID: ${user.auth_user_id}, Username: ${user.username}`);
        });
      }
    }

    // Check user_profiles table
    console.log('\n3. Checking user_profiles table...');
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (profilesError) {
      console.log('❌ Error fetching user profiles:', profilesError.message);
    } else {
      console.log(`✅ Found ${profiles?.length || 0} profiles in user_profiles table`);
      if (profiles && profiles.length > 0) {
        console.log('   Latest profiles:');
        profiles.forEach(profile => {
          console.log(`   - ID: ${profile.id}, User ID: ${profile.user_id}, Username: ${profile.username}`);
        });
      }
    }

    // Check auth.users (if accessible)
    console.log('\n4. Checking auth.users table...');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.log('❌ Error fetching auth users:', authError.message);
    } else {
      console.log(`✅ Found ${authUsers?.users?.length || 0} auth users`);
      if (authUsers?.users && authUsers.users.length > 0) {
        console.log('   Latest auth users:');
        authUsers.users.slice(0, 5).forEach(user => {
          console.log(`   - ID: ${user.id}, Email: ${user.email}, Created: ${user.created_at}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

checkTriggerStatus();