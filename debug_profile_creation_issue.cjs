const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function debugProfileCreationIssue() {
  console.log('🔍 Debugging Profile Creation Issue\n');
  
  try {
    // 1. Check the most recent user
    console.log('1️⃣ Checking most recent user...');
    const testUserId = '8f5d4383-08d8-4ebb-9638-bf70f65e6894'; // From previous test
    
    // 2. Check if profile exists (with more detailed query)
    console.log('2️⃣ Checking if profile exists...');
    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', testUserId);
    
    if (profileError) {
      console.log('   ❌ Profile query error:', profileError.message);
    } else {
      console.log(`   Found ${profiles.length} profiles for user ${testUserId}`);
      if (profiles.length > 0) {
        console.log('   Profile data:', profiles[0]);
      }
    }
    
    // 3. Check all recent users and their profiles
    console.log('\n3️⃣ Checking all recent users...');
    const { data: allProfiles, error: allError } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (allError) {
      console.log('   ❌ All profiles query error:', allError.message);
    } else {
      console.log(`   Found ${allProfiles.length} recent profiles:`);
      allProfiles.forEach((profile, index) => {
        console.log(`   ${index + 1}. User: ${profile.user_id}, Level: ${profile.membership_level}, VIP: ${profile.vip_level}`);
      });
    }
    
    // 4. Try to manually create a profile for the test user
    console.log('\n4️⃣ Attempting to manually create profile...');
    const { data: manualProfile, error: manualError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: testUserId,
        membership_level: 'trial',
        vip_level: 0,
        trial_tasks_completed: 0,
        balance: 0
      })
      .select()
      .single();
    
    if (manualError) {
      console.log('   ❌ Manual profile creation error:', manualError.message);
    } else {
      console.log('   ✅ Manual profile created successfully');
      console.log('   Profile:', manualProfile);
    }
    
    // 5. Check if tasks table exists
    console.log('\n5️⃣ Checking tasks table...');
    const { data: tasksCheck, error: tasksError } = await supabase
      .from('tasks')
      .select('count(*)')
      .limit(1);
    
    if (tasksError) {
      console.log('   ❌ Tasks table error:', tasksError.message);
      console.log('   This explains why task screen might not work');
    } else {
      console.log('   ✅ Tasks table accessible');
    }
    
    // 6. Test the corrected join query
    console.log('\n6️⃣ Testing corrected join query...');
    const { data: joinTest, error: joinError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', testUserId)
      .single();
    
    if (joinError) {
      console.log('   ❌ Join test error:', joinError.message);
    } else {
      console.log('   ✅ Basic profile query works');
      console.log('   Profile data:', joinTest);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

debugProfileCreationIssue();