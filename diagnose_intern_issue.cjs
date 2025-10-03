const { createClient } = require('@supabase/supabase-js');

// FXTrade Supabase configuration
const SUPABASE_URL = 'https://woiccythjszfhbypacaa.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvaWNjeXRoanN6ZmhieXBhY2FhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQ4MjM0NiwiZXhwIjoyMDc0MDU4MzQ2fQ.F1_wsNmySrDhGlstpi3HbAZFWuzFioeGWYTdYA6zlU0';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function diagnoseInternIssue() {
  console.log('🔍 Diagnosing Intern User Task Limit Issue...\n');

  try {
    // 1. Check membership_plans table for 'intern' plan
    console.log('1. Checking membership_plans for "intern" plan...');
    const { data: internPlan, error: planError } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('vip_level', 'intern')
      .single();

    if (planError) {
      console.log('❌ Error fetching intern plan:', planError.message);
      if (planError.code === 'PGRST116') {
        console.log('⚠️  No "intern" plan found in membership_plans table');
      }
    } else {
      console.log('✅ Found intern plan:', internPlan);
    }

    // 2. Check for any plans with vip_level 'Intern' (capitalized)
    console.log('\n2. Checking for capitalized "Intern" plan...');
    const { data: capitalizedInternPlan, error: capError } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('vip_level', 'Intern');

    if (capError) {
      console.log('❌ Error:', capError.message);
    } else {
      console.log('✅ Found capitalized Intern plans:', capitalizedInternPlan);
    }

    // 3. Check all membership plans
    console.log('\n3. Listing all membership plans...');
    const { data: allPlans, error: allPlansError } = await supabase
      .from('membership_plans')
      .select('*')
      .order('vip_level');

    if (allPlansError) {
      console.log('❌ Error fetching all plans:', allPlansError.message);
    } else {
      console.log('📋 All membership plans:');
      allPlans.forEach(plan => {
        console.log(`   - ${plan.vip_level}: ${plan.daily_video_limit} videos/day, ${plan.plan_name}`);
      });
    }

    // 4. Check user_profiles for intern users
    console.log('\n4. Checking user_profiles for intern users...');
    const { data: internUsers, error: usersError } = await supabase
      .from('user_profiles')
      .select('id, vip_level, membership_type, membership_level')
      .or('vip_level.eq.intern,vip_level.eq.Intern,membership_type.eq.intern,membership_level.eq.Intern')
      .limit(5);

    if (usersError) {
      console.log('❌ Error fetching intern users:', usersError.message);
    } else {
      console.log('👥 Sample intern users:');
      internUsers.forEach(user => {
        console.log(`   - ID: ${user.id}, VIP: ${user.vip_level}, Type: ${user.membership_type}, Level: ${user.membership_level}`);
      });
    }

    // 5. Simulate the Task.tsx logic
    console.log('\n5. Simulating Task.tsx logic for intern user...');
    
    // Mock user with intern VIP level
    const mockUser = { vip_level: 'intern' };
    
    // Try to find membership plan (like Task.tsx does)
    const { data: membershipPlan } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('vip_level', mockUser.vip_level)
      .single();

    let daily_tasks_limit;
    
    if (membershipPlan) {
      daily_tasks_limit = membershipPlan.daily_video_limit;
      console.log(`✅ Found plan for intern: ${daily_tasks_limit} tasks/day`);
    } else {
      // Fallback logic from Task.tsx
      console.log('⚠️  No plan found, using fallback logic...');
      const vipLevelMap = {
        'VIP1': 5, 'VIP2': 7, 'VIP3': 10, 'VIP4': 12, 'VIP5': 15,
        'VIP6': 18, 'VIP7': 20, 'VIP8': 25, 'VIP9': 30, 'VIP10': 35
      };
      daily_tasks_limit = vipLevelMap[mockUser.vip_level] || 5; // Default to 5
      console.log(`📝 Fallback limit for "${mockUser.vip_level}": ${daily_tasks_limit} tasks/day`);
    }

    // 6. Recommendations
    console.log('\n📋 DIAGNOSIS SUMMARY:');
    console.log('='.repeat(50));
    
    if (!internPlan && !capitalizedInternPlan?.length) {
      console.log('🔴 ISSUE FOUND: No "intern" plan exists in membership_plans table');
      console.log('💡 SOLUTION: Add an intern plan to membership_plans table');
      console.log('   Suggested SQL:');
      console.log(`   INSERT INTO membership_plans (vip_level, plan_name, daily_video_limit, price, duration_days) 
   VALUES ('intern', 'Intern Plan', 3, 0, 3);`);
    } else {
      console.log('✅ Intern plan exists in database');
    }

    console.log(`\n🎯 Current behavior: Intern users get ${daily_tasks_limit} tasks/day`);
    console.log('📱 UI shows "0/5 completed" because:');
    console.log('   - Task completion count starts at 0 for new users');
    console.log('   - Daily limit determines the denominator');
    console.log('   - This is normal behavior for new users');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the diagnosis
diagnoseInternIssue().then(() => {
  console.log('\n🏁 Diagnosis complete!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});