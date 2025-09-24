const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://woiccythjszfhbypacaa.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvaWNjeXRoanN6ZmhieXBhY2FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0ODIzNDYsImV4cCI6MjA3NDA1ODM0Nn0.TkSPiZDpS4wFORklYUEiOIhy3E5Q41-XTMj1btQKe_k";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testNewUserRegistration() {
  console.log('🧪 Testing New User Registration Flow...\n');

  // Generate a unique test user
  const timestamp = Date.now();
  const testPhone = `92300${timestamp.toString().slice(-7)}`;
  const testEmail = `${testPhone}@forextrade.com`;
  const testPassword = 'TestPass123!';
  const testFullName = `Test User ${timestamp}`;

  try {
    console.log('1. Creating new user account...');
    console.log(`   Phone: ${testPhone}`);
    console.log(`   Email: ${testEmail}`);
    console.log(`   Name: ${testFullName}\n`);

    // Step 1: Sign up the user
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        emailRedirectTo: undefined,
        data: {
          phone: testPhone,
          display_name: testFullName,
          email_confirmed: true
        }
      }
    });

    if (signUpError) {
      console.error('❌ Signup failed:', signUpError.message);
      return;
    }

    console.log('✅ User account created successfully');
    console.log(`   User ID: ${signUpData.user?.id}\n`);

    // Step 2: Sign in to get authenticated session
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });

    if (signInError) {
      console.error('❌ Sign in failed:', signInError.message);
      return;
    }

    console.log('✅ User signed in successfully\n');

    // Step 3: Check if user profile was created
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', signUpData.user.id)
      .single();

    if (profileError) {
      console.error('❌ Failed to fetch user profile:', profileError.message);
      return;
    }

    console.log('📋 User Profile Created:');
    console.log(`   Membership Type: ${profileData.membership_type}`);
    console.log(`   Trial Active: ${profileData.is_trial_active}`);
    console.log(`   Trial Start: ${profileData.trial_start_date}`);
    console.log(`   Trial End: ${profileData.trial_end_date}`);
    console.log(`   Total Earnings: ${profileData.total_earnings}`);
    console.log(`   Videos Watched Today: ${profileData.videos_watched_today}\n`);

    // Step 4: Check membership plans
    const { data: membershipPlans, error: plansError } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('name', 'Intern');

    if (plansError) {
      console.error('❌ Failed to fetch membership plans:', plansError.message);
    } else {
      console.log('📊 Intern Membership Plan:');
      if (membershipPlans.length > 0) {
        const internPlan = membershipPlans[0];
        console.log(`   Name: ${internPlan.name}`);
        console.log(`   Daily Video Limit: ${internPlan.daily_video_limit}`);
        console.log(`   Price: ${internPlan.price}`);
        console.log(`   Duration Days: ${internPlan.duration_days}`);
        console.log(`   Is Active: ${internPlan.is_active}\n`);
      } else {
        console.log('   ❌ No Intern plan found in database\n');
      }
    }

    // Step 5: Check if user should be assigned intern membership
    console.log('🔍 Analysis:');
    if (profileData.membership_type === 'free') {
      console.log('   ⚠️  User is assigned "free" membership instead of "intern"');
      console.log('   ⚠️  This might be the issue causing problems for new users');
    } else if (profileData.membership_type === 'intern') {
      console.log('   ✅ User correctly assigned "intern" membership');
    } else {
      console.log(`   ❓ User has unexpected membership type: ${profileData.membership_type}`);
    }

    // Step 6: Clean up test user
    console.log('\n🧹 Cleaning up test user...');
    await supabase.auth.signOut();
    
    console.log('✅ Test completed successfully');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

testNewUserRegistration();