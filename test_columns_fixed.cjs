const { createClient } = require('@supabase/supabase-js');

// Get environment variables
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function testColumnsFix() {
  try {
    console.log('Testing if missing columns have been added...');
    
    // Try to fetch user data including the missing columns
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, username, daily_task_limit, referral_count')
      .limit(1);

    if (usersError) {
      console.error('❌ Error fetching users with new columns:', usersError);
      
      if (usersError.message.includes('daily_task_limit')) {
        console.log('❌ daily_task_limit column is still missing');
      }
      if (usersError.message.includes('referral_count')) {
        console.log('❌ referral_count column is still missing');
      }
      
      console.log('\n📋 TO FIX: Please run the SQL in MANUAL_SQL_FIX.sql in the Supabase dashboard');
      return false;
    }

    if (users && users.length > 0) {
      console.log('✅ Success! Both columns are now available');
      console.log('Sample user data:', users[0]);
      
      // Test if we can update these columns
      console.log('\nTesting column updates...');
      const testUserId = users[0].id;
      
      const { data: updateData, error: updateError } = await supabase
        .from('users')
        .update({ 
          daily_task_limit: 10,
          referral_count: 5 
        })
        .eq('id', testUserId)
        .select();

      if (updateError) {
        console.error('❌ Error updating columns:', updateError);
        return false;
      }

      console.log('✅ Column updates work correctly:', updateData[0]);
      
      // Restore original values
      await supabase
        .from('users')
        .update({ 
          daily_task_limit: 5,
          referral_count: 0 
        })
        .eq('id', testUserId);

      console.log('✅ All tests passed! The missing columns have been successfully added.');
      return true;
    } else {
      console.log('⚠️  No users found in the table');
      return false;
    }

  } catch (error) {
    console.error('❌ Error during testing:', error);
    return false;
  }
}

testColumnsFix().then(success => {
  if (success) {
    console.log('\n🎉 Database schema is now fixed! The frontend errors should be resolved.');
  } else {
    console.log('\n⚠️  Manual intervention required. Please execute MANUAL_SQL_FIX.sql in Supabase dashboard.');
  }
});