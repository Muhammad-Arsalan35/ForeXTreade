const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Use service key for admin operations
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const supabaseClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function testSignupTrigger() {
  console.log('🧪 Testing signup trigger functionality...');
  
  try {
    // Generate a unique test email
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    
    console.log(`📧 Testing with email: ${testEmail}`);
    
    // Step 1: Try to sign up a new user
    console.log('\n1️⃣ Attempting user signup...');
    const { data: signupData, error: signupError } = await supabaseClient.auth.signUp({
      email: testEmail,
      password: testPassword,
    });
    
    if (signupError) {
      console.error('❌ Signup failed:', signupError);
      return;
    }
    
    console.log('✅ User signup successful');
    console.log('User ID:', signupData.user?.id);
    
    // Step 2: Wait a moment for trigger to execute
    console.log('\n2️⃣ Waiting for trigger to execute...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 3: Check if profile was created
    console.log('\n3️⃣ Checking if profile was created...');
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', signupData.user.id)
      .single();
      
    if (profileError) {
      console.error('❌ Profile not found:', profileError);
      
      // Try to manually create the profile to test the structure
      console.log('\n🔧 Attempting manual profile creation...');
      const { data: manualProfile, error: manualError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          user_id: signupData.user.id,
          membership_level: 'trial',
          vip_level: 0,
          trial_tasks_completed: 0,
          total_earnings: 0,
          income_wallet_balance: 0,
          personal_wallet_balance: 0,
          daily_earnings_today: 0,
          videos_watched_today: 0,
          intern_trial_start_date: new Date().toISOString().split('T')[0],
          intern_trial_end_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          intern_trial_expired: false,
          last_video_reset_date: new Date().toISOString().split('T')[0],
          last_earning_reset_date: new Date().toISOString().split('T')[0]
        })
        .select();
        
      if (manualError) {
        console.error('❌ Manual profile creation failed:', manualError);
      } else {
        console.log('✅ Manual profile creation successful:', manualProfile);
      }
    } else {
      console.log('✅ Profile found automatically:', profile);
    }
    
    // Step 4: Clean up test user
    console.log('\n4️⃣ Cleaning up test user...');
    
    // Delete profile first (if exists)
    await supabaseAdmin
      .from('user_profiles')
      .delete()
      .eq('user_id', signupData.user.id);
      
    // Delete user from auth.users (admin operation)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(signupData.user.id);
    
    if (deleteError) {
      console.error('⚠️ User cleanup error:', deleteError.message);
    } else {
      console.log('✅ Test user cleaned up');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testSignupTrigger().catch(console.error);