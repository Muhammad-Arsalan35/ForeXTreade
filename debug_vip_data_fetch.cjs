const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function debugVipDataFetch() {
  console.log('🔍 Debugging VIP Level Data Fetch Issues...\n');

  try {
    // 1. Check the most recent user and their profile
    console.log('1. Checking most recent user and profile...');
    const { data: recentUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (userError) {
      console.error('❌ Error fetching recent user:', userError);
      return;
    }

    if (recentUser && recentUser.length > 0) {
      console.log('✅ Most recent user:', {
        id: recentUser[0].id,
        username: recentUser[0].username,
        user_status: recentUser[0].user_status,
        created_at: recentUser[0].created_at
      });

      // Get their profile
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', recentUser[0].id)
        .single();

      if (profileError) {
        console.error('❌ Error fetching user profile:', profileError);
      } else {
        console.log('✅ User profile:', {
          membership_level: userProfile.membership_level,
          vip_level: userProfile.vip_level,
          trial_tasks_completed: userProfile.trial_tasks_completed,
          created_at: userProfile.created_at
        });
      }
    }

    // 2. Check membership_level enum values
    console.log('\n2. Checking membership_level enum values...');
    const { data: enumData, error: enumError } = await supabase
      .rpc('sql', {
        query: `
          SELECT enumlabel 
          FROM pg_enum 
          WHERE enumtypid = (
            SELECT oid 
            FROM pg_type 
            WHERE typname = 'membership_level'
          )
          ORDER BY enumlabel;
        `
      });

    if (enumError) {
      console.error('❌ Error checking enum values:', enumError);
    } else {
      console.log('✅ Available membership_level values:', enumData?.map(row => row.enumlabel));
    }

    // 3. Check VIP level configurations
    console.log('\n3. Checking VIP level configurations...');
    const { data: vipLevels, error: vipError } = await supabase
      .from('vip_levels')
      .select('*')
      .order('level');

    if (vipError) {
      console.error('❌ Error fetching VIP levels:', vipError);
    } else {
      console.log('✅ VIP levels available:', vipLevels?.length || 0);
      vipLevels?.forEach(vip => {
        console.log(`   - VIP${vip.level}: ${vip.task_reward} PKR per task, ${vip.daily_tasks} daily tasks`);
      });
    }

    // 4. Check membership plans
    console.log('\n4. Checking membership plans...');
    const { data: plans, error: plansError } = await supabase
      .from('membership_plans')
      .select('*')
      .order('id');

    if (plansError) {
      console.error('❌ Error fetching membership plans:', plansError);
    } else {
      console.log('✅ Membership plans available:', plans?.length || 0);
      plans?.forEach(plan => {
        console.log(`   - ${plan.name}: ${plan.price} PKR, VIP${plan.vip_level}`);
      });
    }

    // 5. Test a simple data fetch that might be failing
    console.log('\n5. Testing common data fetch operations...');
    
    // Test fetching user with profile join
    const { data: userWithProfile, error: joinError } = await supabase
      .from('users')
      .select(`
        *,
        user_profiles (
          membership_level,
          vip_level,
          trial_tasks_completed
        )
      `)
      .order('created_at', { ascending: false })
      .limit(1);

    if (joinError) {
      console.error('❌ Error in user-profile join:', joinError);
    } else {
      console.log('✅ User with profile join successful');
    }

    // 6. Check for any RLS issues
    console.log('\n6. Checking RLS status...');
    const { data: rlsStatus, error: rlsError } = await supabase
      .rpc('sql', {
        query: `
          SELECT 
            schemaname,
            tablename,
            rowsecurity
          FROM pg_tables 
          WHERE schemaname = 'public' 
          AND tablename IN ('users', 'user_profiles', 'vip_levels', 'membership_plans')
          ORDER BY tablename;
        `
      });

    if (rlsError) {
      console.error('❌ Error checking RLS:', rlsError);
    } else {
      console.log('✅ RLS Status:');
      rlsStatus?.forEach(table => {
        console.log(`   - ${table.tablename}: RLS ${table.rowsecurity ? 'ENABLED' : 'DISABLED'}`);
      });
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

debugVipDataFetch();