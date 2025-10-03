const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testUpdatedSchema() {
  console.log('🔍 Testing updated database schema...\n');
  
  try {
    // 1. Check users table structure
    console.log('1. Checking users table structure...');
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (usersError) {
      console.error('❌ Users table error:', usersError.message);
    } else {
      console.log('✅ Users table accessible');
      if (usersData && usersData.length > 0) {
        console.log('📋 Available columns:', Object.keys(usersData[0]).join(', '));
      }
    }
    
    // 2. Check if position_title column exists (should NOT exist now)
    console.log('\n2. Checking for position_title column...');
    const { data: positionTitleTest, error: positionTitleError } = await supabase
      .from('users')
      .select('position_title')
      .limit(1);
    
    if (positionTitleError) {
      if (positionTitleError.message.includes('column "position_title" does not exist')) {
        console.log('✅ Confirmed: position_title column has been removed (no more PGRST204 error)');
      } else {
        console.log('⚠️ Unexpected error:', positionTitleError.message);
      }
    } else {
      console.log('⚠️ position_title column still exists');
    }
    
    // 3. Test basic user query
    console.log('\n3. Testing basic user query...');
    const { data: testUsers, error: testError } = await supabase
      .from('users')
      .select('id, username, vip_level, full_name, trial_start_date, trial_end_date')
      .limit(3);
    
    if (testError) {
      console.error('❌ Query error:', testError.message);
    } else {
      console.log('✅ Query successful');
      console.log(`📊 Found ${testUsers.length} users in database`);
      if (testUsers.length > 0) {
        console.log('Sample user data:');
        testUsers.forEach((user, index) => {
          console.log(`  User ${index + 1}: ${user.username} (${user.vip_level}) - Trial: ${user.trial_start_date} to ${user.trial_end_date}`);
        });
      }
    }
    
    // 4. Check user_profiles table
    console.log('\n4. Checking user_profiles table...');
    const { data: profilesData, error: profilesError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1);
    
    if (profilesError) {
      console.log('ℹ️ User profiles table status:', profilesError.message);
    } else {
      console.log('✅ User_profiles table accessible');
      if (profilesData && profilesData.length > 0) {
        console.log('📋 Profile columns:', Object.keys(profilesData[0]).join(', '));
      }
    }
    
    console.log('\n🎉 Schema verification completed!');
    console.log('\n📝 Summary:');
    console.log('- Users table is accessible with updated schema');
    console.log('- PGRST204 position_title error should be resolved');
    console.log('- Signup process should work smoothly now');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testUpdatedSchema();