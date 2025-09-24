const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function fixVipLevelData() {
  console.log('🔧 Fixing VIP level data inconsistencies...');
  
  try {
    // Fix users with vip_level = 'trial' to vip_level = 0
    const { data: updateResult, error: updateError } = await supabase
      .from('user_profiles')
      .update({ 
        vip_level: 0,
        membership_level: 'trial'
      })
      .eq('vip_level', 'trial');
      
    if (updateError) {
      console.error('❌ Update error:', updateError);
      return;
    }
    
    console.log('✅ Fixed VIP level data');
    
    // Verify the fix
    const { data: profiles, error: fetchError } = await supabase
      .from('user_profiles')
      .select('user_id, vip_level, membership_level')
      .limit(5);
      
    if (fetchError) {
      console.error('❌ Fetch error:', fetchError);
      return;
    }
    
    console.log('📊 Sample profiles after fix:');
    profiles.forEach(p => {
      console.log(`   User: ${p.user_id.substring(0,8)}... VIP: ${p.vip_level} (${typeof p.vip_level}) Membership: ${p.membership_level}`);
    });
    
    // Test a new user signup to see if it works now
    console.log('\n🧪 Testing new user signup...');
    const testEmail = `test_after_fix_${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword
    });
    
    if (signupError) {
      console.error('❌ Signup error:', signupError);
      return;
    }
    
    console.log('✅ New user signup successful');
    
    // Wait a moment for trigger to execute
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if profile was created
    const { data: newProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', signupData.user.id)
      .single();
      
    if (profileError) {
      console.error('❌ Profile fetch error:', profileError);
      return;
    }
    
    console.log('✅ Profile created automatically:', {
      vip_level: newProfile.vip_level,
      membership_level: newProfile.membership_level,
      trial_tasks_completed: newProfile.trial_tasks_completed
    });
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

fixVipLevelData().catch(console.error);