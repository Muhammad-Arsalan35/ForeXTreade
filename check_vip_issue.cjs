const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://woiccythjszfhbypacaa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvaWNjeXRoanN6ZmhieXBhY2FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0ODIzNDYsImV4cCI6MjA3NDA1ODM0Nn0.TkSPiZDpS4wFORklYUEiOIhy3E5Q41-XTMj1btQKe_k'
);

async function checkVipIssue() {
  console.log('🔍 Checking VIP assignment issue...\n');
  
  // 1. Check the current trigger function
  console.log('1. Checking trigger function...');
  const { data: functionData, error: functionError } = await supabase
    .from('pg_proc')
    .select('*')
    .eq('proname', 'create_user_profile_from_auth');
  
  if (functionError) {
    console.log('❌ Error checking function:', functionError.message);
  } else {
    console.log('✅ Function exists:', functionData.length > 0);
  }
  
  // 2. Check recent user profiles to see VIP levels
  console.log('\n2. Checking recent user profiles...');
  const { data: profiles, error: profileError } = await supabase
    .from('user_profiles')
    .select('id, username, vip_level, membership_type, created_at')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (profileError) {
    console.log('❌ Error checking profiles:', profileError.message);
  } else {
    console.log('✅ Recent profiles:');
    profiles.forEach(profile => {
      console.log(`   - ${profile.username}: VIP ${profile.vip_level}, Type: ${profile.membership_type}`);
    });
  }
  
  // 3. Check membership plans
  console.log('\n3. Checking membership plans...');
  const { data: plans, error: plansError } = await supabase
    .from('membership_plans')
    .select('*')
    .order('id');
  
  if (plansError) {
    console.log('❌ Error checking plans:', plansError.message);
  } else {
    console.log('✅ Available membership plans:');
    plans.forEach(plan => {
      console.log(`   - ID: ${plan.id}, Name: ${plan.name}, VIP Level: ${plan.vip_level}`);
    });
  }
  
  // 4. Check if there's a trial plan
  const trialPlan = plans?.find(p => p.name.toLowerCase().includes('trial'));
  if (trialPlan) {
    console.log(`\n✅ Trial plan found: ID ${trialPlan.id}, VIP Level: ${trialPlan.vip_level}`);
  } else {
    console.log('\n❌ No trial plan found!');
  }
}

checkVipIssue().catch(console.error);