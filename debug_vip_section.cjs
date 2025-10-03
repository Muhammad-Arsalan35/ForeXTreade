const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://woiccythjszfhbypacaa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvaWNjeXRoanN6ZmhieXBhY2FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0ODIzNDYsImV4cCI6MjA3NDA1ODM0Nn0.TkSPiZDpS4wFORklYUEiOIhy3E5Q41-XTMj1btQKe_k';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugVipSection() {
  try {
    console.log('🔍 Debugging VIP Member Activation Section...\n');

    // Check membership plans
    console.log('📋 Checking membership_plans table:');
    const { data: plansData, error: plansError } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });

    if (plansError) {
      console.error('❌ Error fetching plans:', plansError);
    } else {
      console.log(`✅ Found ${plansData?.length || 0} active membership plans:`);
      plansData?.forEach((plan, index) => {
        console.log(`  ${index + 1}. ${plan.name} - Rs. ${plan.price} (${plan.daily_video_limit} daily tasks)`);
      });
    }

    // Check if table exists and has data
    console.log('\n📊 Checking membership_plans table structure:');
    const { data: allPlans, error: allPlansError } = await supabase
      .from('membership_plans')
      .select('*')
      .limit(5);

    if (allPlansError) {
      console.error('❌ Error accessing membership_plans table:', allPlansError);
    } else {
      console.log(`✅ Total plans in table: ${allPlans?.length || 0}`);
      if (allPlans && allPlans.length > 0) {
        console.log('📝 Sample plan structure:', JSON.stringify(allPlans[0], null, 2));
      }
    }

    // Check current user
    console.log('\n👤 Checking current user authentication:');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('❌ Auth error:', userError);
    } else if (user) {
      console.log(`✅ User authenticated: ${user.email}`);
      
      // Check user record
      const { data: userData, error: userDataError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', user.id)
        .single();
        
      if (userDataError) {
        console.error('❌ Error fetching user data:', userDataError);
      } else {
        console.log(`✅ User record found: ${userData?.full_name} (VIP Level: ${userData?.vip_level || 'None'})`);
        console.log(`💰 Balance: Rs. ${userData?.total_earnings || 0}`);
      }
    } else {
      console.log('❌ No user authenticated');
    }

  } catch (error) {
    console.error('💥 Debug script error:', error);
  }
}

debugVipSection();