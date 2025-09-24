const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://woiccythjszfhbypacaa.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvaWNjeXRoanN6ZmhieXBhY2FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0ODIzNDYsImV4cCI6MjA3NDA1ODM0Nn0.TkSPiZDpS4wFORklYUEiOIhy3E5Q41-XTMj1btQKe_k";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkUserProfileIssue() {
  console.log('🔍 Checking User Profile Creation Issue...\n');

  try {
    // Check the test user we just created
    const testUserId = '09bb12c7-7715-4577-b820-8f122f529f5f';
    
    console.log(`1. Checking user profiles for user ID: ${testUserId}`);
    
    // Check if any profiles exist for this user
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', testUserId);

    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError.message);
      return;
    }

    console.log(`   Found ${profiles.length} profile(s):`);
    profiles.forEach((profile, index) => {
      console.log(`   Profile ${index + 1}:`);
      console.log(`     ID: ${profile.id}`);
      console.log(`     User ID: ${profile.user_id}`);
      console.log(`     Full Name: ${profile.full_name}`);
      console.log(`     Membership Type: ${profile.membership_type}`);
      console.log(`     Trial Active: ${profile.is_trial_active}`);
      console.log(`     Created At: ${profile.created_at}\n`);
    });

    // Check if user exists in auth.users
    console.log('2. Checking auth.users table...');
    const { data: authUser, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.log('   ❌ Not authenticated, checking with admin client...');
    } else {
      console.log(`   ✅ Current authenticated user: ${authUser.user?.id}`);
    }

    // Check membership plans
    console.log('\n3. Checking membership plans...');
    const { data: plans, error: plansError } = await supabase
      .from('membership_plans')
      .select('*')
      .order('name');

    if (plansError) {
      console.error('❌ Error fetching membership plans:', plansError.message);
    } else {
      console.log(`   Found ${plans.length} membership plan(s):`);
      plans.forEach(plan => {
        console.log(`     ${plan.name}: ${plan.daily_video_limit} videos/day, $${plan.price}, ${plan.duration_days} days`);
      });
    }

    // Check if there's a trigger or function that should create profiles
    console.log('\n4. Analysis:');
    if (profiles.length === 0) {
      console.log('   ❌ No user profile was created automatically');
      console.log('   ❌ This suggests the trigger/function for auto-creating profiles is missing or not working');
    } else if (profiles.length > 1) {
      console.log('   ⚠️  Multiple profiles found - this should not happen');
    } else {
      console.log('   ✅ Single profile found - this is correct');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

checkUserProfileIssue();