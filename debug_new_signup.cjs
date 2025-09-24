const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function debugNewSignup() {
  console.log('🔍 Debugging New User Signup...\n');

  try {
    // 1. Check the most recent users
    console.log('1. Checking recent users...');
    const { data: recentUsers, error: usersError } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3);

    if (usersError) {
      console.error('❌ Users error:', usersError);
    } else {
      console.log(`✅ Recent users: ${recentUsers?.length} found`);
      recentUsers?.forEach(u => {
        console.log(`   - ${u.username} (${u.auth_user_id}) - ${u.created_at}`);
      });
    }

    // 2. Check if these users have profiles
    console.log('\n2. Checking profiles for recent users...');
    if (recentUsers?.length > 0) {
      const userIds = recentUsers.map(u => u.id);
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('*')
        .in('user_id', userIds);

      if (profilesError) {
        console.error('❌ Profiles error:', profilesError);
      } else {
        console.log(`✅ Profiles found: ${profiles?.length}`);
        profiles?.forEach(p => {
          console.log(`   - ${p.username}: ${p.membership_level}, VIP${p.vip_level}, Tasks: ${p.trial_tasks_completed}`);
        });

        // Check for missing profiles
        const profileUserIds = profiles?.map(p => p.user_id) || [];
        const missingProfiles = recentUsers.filter(u => !profileUserIds.includes(u.id));
        if (missingProfiles.length > 0) {
          console.log(`⚠️ Users without profiles: ${missingProfiles.length}`);
          missingProfiles.forEach(u => {
            console.log(`   - ${u.username} (ID: ${u.id})`);
          });
        }
      }
    }

    // 3. Check trigger status
    console.log('\n3. Checking trigger status...');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Auth users error:', authError);
    } else {
      console.log(`✅ Auth users: ${authUsers?.users?.length} found`);
      
      // Check the most recent auth user
      const recentAuthUser = authUsers?.users?.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];
      
      if (recentAuthUser) {
        console.log(`   Most recent auth user: ${recentAuthUser.email} (${recentAuthUser.id})`);
        
        // Check if this auth user has a corresponding user record
        const { data: userRecord, error: userRecordError } = await supabase
          .from('users')
          .select('*')
          .eq('auth_user_id', recentAuthUser.id)
          .single();

        if (userRecordError) {
          console.error('❌ No user record found for recent auth user:', userRecordError);
        } else {
          console.log(`✅ User record found: ${userRecord.username}`);
          
          // Check if this user has a profile
          const { data: userProfile, error: userProfileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', userRecord.id)
            .single();

          if (userProfileError) {
            console.error('❌ No profile found for user:', userProfileError);
          } else {
            console.log(`✅ Profile found: ${userProfile.username}, ${userProfile.membership_level}`);
          }
        }
      }
    }

    // 4. Fix existing user data inconsistencies
    console.log('\n4. Fixing existing user data inconsistencies...');
    const { data: fixResult, error: fixError } = await supabase
      .from('user_profiles')
      .update({ 
        membership_level: 'trial',
        vip_level: 0 
      })
      .eq('membership_level', 'Intern');

    if (fixError) {
      console.error('❌ Fix error:', fixError);
    } else {
      console.log('✅ Fixed existing user data inconsistencies');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

debugNewSignup();