const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugTaskIssue() {
  try {
    console.log('🔍 Debugging Task Display Issue...\n');

    // Get all users to see their VIP levels
    console.log('1. Checking all users and their VIP levels:');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, auth_user_id, full_name, vip_level, total_earnings');
    
    if (usersError) {
      console.error('Error fetching users:', usersError);
      return;
    }

    console.log(`Found ${users.length} users:`);
    users.forEach(user => {
      console.log(`  - ${user.full_name} (ID: ${user.id})`);
      console.log(`    VIP Level: ${user.vip_level || 'None'}`);
      console.log(`    Total Earnings: ${user.total_earnings || 0}`);
      console.log('');
    });

    // Check membership plans
    console.log('2. Checking membership plans:');
    const { data: plans, error: plansError } = await supabase
      .from('membership_plans')
      .select('*');
    
    if (plansError) {
      console.error('Error fetching plans:', plansError);
      return;
    }

    console.log(`Found ${plans.length} membership plans:`);
    plans.forEach(plan => {
      console.log(`  - ${plan.name}: Daily Limit = ${plan.daily_video_limit}, Video Rate = ${plan.video_rate}`);
    });
    console.log('');

    // Check task completions for each user
    console.log('3. Checking task completions:');
    const { data: completions, error: completionsError } = await supabase
      .from('task_completions')
      .select('*');
    
    if (completionsError) {
      console.error('Error fetching task completions:', completionsError);
      return;
    }

    console.log(`Found ${completions.length} task completions:`);
    if (completions.length === 0) {
      console.log('  No task completions found - this explains why remaining tasks shows 0!');
    } else {
      completions.forEach(completion => {
        console.log(`  - User ${completion.user_id}: Task ${completion.task_id} completed at ${completion.completed_at}`);
      });
    }
    console.log('');

    // Check user_plans table
    console.log('4. Checking user_plans table:');
    const { data: userPlans, error: userPlansError } = await supabase
      .from('user_plans')
      .select('*');
    
    if (userPlansError) {
      console.error('Error fetching user plans:', userPlansError);
      return;
    }

    console.log(`Found ${userPlans.length} user plans:`);
    userPlans.forEach(userPlan => {
      console.log(`  - User ${userPlan.user_id}: Plan ${userPlan.plan_id}, Status: ${userPlan.status}`);
    });
    console.log('');

    // For the first user, simulate the useTaskCompletion logic
    if (users.length > 0) {
      const firstUser = users[0];
      console.log(`5. Simulating useTaskCompletion logic for user: ${firstUser.full_name}`);
      
      // Get user's VIP level and corresponding plan
      const vipLevel = firstUser.vip_level;
      console.log(`   VIP Level: ${vipLevel || 'None'}`);
      
      if (vipLevel) {
        const { data: membershipPlan, error: planError } = await supabase
          .from('membership_plans')
          .select('daily_video_limit')
          .eq('name', vipLevel)
          .single();
        
        if (planError) {
          console.log(`   Error fetching plan for VIP level ${vipLevel}:`, planError);
          console.log(`   Using default daily limit: 5`);
        } else {
          console.log(`   Daily limit from plan: ${membershipPlan.daily_video_limit}`);
        }
      } else {
        console.log(`   No VIP level set, using default daily limit: 5`);
      }

      // Get today's completed tasks
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

      const { data: todayCompletions, error: todayError } = await supabase
        .from('task_completions')
        .select('task_id')
        .eq('user_id', firstUser.id)
        .gte('completed_at', startOfDay.toISOString())
        .lte('completed_at', endOfDay.toISOString());

      if (todayError) {
        console.log(`   Error fetching today's completions:`, todayError);
      } else {
        console.log(`   Today's completed tasks: ${todayCompletions.length}`);
        console.log(`   Remaining tasks should be: ${5 - todayCompletions.length}`);
      }
    }

  } catch (error) {
    console.error('Debug failed:', error);
  }
}

debugTaskIssue();