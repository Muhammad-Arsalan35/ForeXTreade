const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://woiccythjszfhbypacaa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvaWNjeXRoanN6ZmhieXBhY2FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0ODIzNDYsImV4cCI6MjA3NDA1ODM0Nn0.TkSPiZDpS4wFORklYUEiOIhy3E5Q41-XTMj1btQKe_k';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkVipAndTasks() {
  try {
    console.log('🔍 Checking VIP Level and Top 5 Tasks...\n');

    // Get all users with their VIP levels
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, full_name, vip_level, income_wallet_balance, personal_wallet_balance')
      .order('created_at', { ascending: false });

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }

    console.log('👥 Users and their VIP Levels:');
    console.log('================================');
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.full_name}`);
      console.log(`   VIP Level: ${user.vip_level || 'Not Set'}`);
      console.log(`   Income Wallet: $${user.income_wallet_balance || 0}`);
      console.log(`   Personal Wallet: $${user.personal_wallet_balance || 0}`);
      console.log('');
    });

    // Get VIP level details
    console.log('🏆 VIP Level Information:');
    console.log('=========================');
    
    const vipLevels = {
      'VIP1': { rate: 30, dailyLimit: 5 },
      'VIP2': { rate: 50, dailyLimit: 10 },
      'VIP3': { rate: 70, dailyLimit: 16 },
      'VIP4': { rate: 80, dailyLimit: 31 },
      'VIP5': { rate: 100, dailyLimit: 50 },
      'VIP6': { rate: 115, dailyLimit: 75 },
      'VIP7': { rate: 160, dailyLimit: 100 },
      'VIP8': { rate: 220, dailyLimit: 120 },
      'VIP9': { rate: 260, dailyLimit: 150 },
      'VIP10': { rate: 440, dailyLimit: 180 }
    };

    Object.entries(vipLevels).forEach(([level, details]) => {
      console.log(`${level}: ${details.rate} PKR per task, ${details.dailyLimit} daily tasks`);
    });

    // Get top 5 active tasks
    console.log('\n📋 Top 5 Active Tasks:');
    console.log('======================');
    
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .eq('task_status', 'active')
      .order('created_at', { ascending: false })
      .limit(5);

    if (tasksError) {
      console.error('❌ Error fetching tasks:', tasksError);
    } else if (tasks && tasks.length > 0) {
      tasks.forEach((task, index) => {
        console.log(`${index + 1}. ${task.title}`);
        console.log(`   Category: ${task.category || 'General'}`);
        console.log(`   Duration: ${task.duration_seconds || 10} seconds`);
        console.log(`   Min VIP Level: ${task.min_vip_level || 'VIP1'}`);
        console.log(`   Description: ${task.description || 'No description'}`);
        console.log('');
      });
    } else {
      console.log('No active tasks found in database.');
    }

    // Get membership plans
    console.log('💎 Available Membership Plans:');
    console.log('==============================');
    
    const { data: plans, error: plansError } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (plansError) {
      console.error('❌ Error fetching membership plans:', plansError);
    } else if (plans && plans.length > 0) {
      plans.forEach((plan, index) => {
        console.log(`${index + 1}. ${plan.name}`);
        console.log(`   Price: $${plan.price || 'N/A'}`);
        console.log(`   Daily Video Limit: ${plan.daily_video_limit || 'N/A'}`);
        console.log(`   Description: ${plan.description || 'No description'}`);
        console.log('');
      });
    } else {
      console.log('No active membership plans found.');
    }

    // Check task completions for today
    console.log('📊 Today\'s Task Completions:');
    console.log('============================');
    
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    const { data: completions, error: completionsError } = await supabase
      .from('task_completions')
      .select(`
        *,
        users!inner(full_name, vip_level),
        tasks(title)
      `)
      .gte('completed_at', startOfDay.toISOString())
      .lte('completed_at', endOfDay.toISOString())
      .order('completed_at', { ascending: false });

    if (completionsError) {
      console.error('❌ Error fetching task completions:', completionsError);
    } else if (completions && completions.length > 0) {
      completions.forEach((completion, index) => {
        console.log(`${index + 1}. ${completion.users.full_name} (${completion.users.vip_level})`);
        console.log(`   Task: ${completion.tasks?.title || 'Unknown Task'}`);
        console.log(`   Reward: $${completion.reward_earned || 0}`);
        console.log(`   Completed: ${new Date(completion.completed_at).toLocaleTimeString()}`);
        console.log('');
      });
    } else {
      console.log('No task completions found for today.');
    }

    console.log('✅ VIP and Tasks check completed successfully!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkVipAndTasks();