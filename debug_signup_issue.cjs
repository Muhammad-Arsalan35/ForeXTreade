const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function debugSignupIssue() {
  console.log('🔍 Debugging signup issue...');
  
  try {
    // Check user_profiles table structure using direct query
    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1);
      
    if (profileError) {
      console.error('❌ User profiles table error:', profileError);
    } else {
      console.log('✅ User profiles table accessible');
      if (profiles.length > 0) {
        console.log('📊 Sample profile structure:', Object.keys(profiles[0]));
      }
    }
    
    // Check if we can access auth.users (this might be restricted)
    console.log('\n🔍 Checking auth access...');
    const { data: authData, error: authError } = await supabase.auth.getUser();
    console.log('Auth status:', authError ? 'No current user' : 'User authenticated');
    
    // Try to manually create a profile for testing
    console.log('\n🧪 Testing manual profile creation...');
    const testUserId = '00000000-0000-0000-0000-000000000001'; // Fake UUID for testing
    
    const { data: insertResult, error: insertError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: testUserId,
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
      
    if (insertError) {
      console.error('❌ Manual insert error:', insertError);
      console.log('Error details:', insertError.details);
      console.log('Error hint:', insertError.hint);
    } else {
      console.log('✅ Manual insert successful:', insertResult);
      
      // Clean up test data
      const { error: deleteError } = await supabase
        .from('user_profiles')
        .delete()
        .eq('user_id', testUserId);
        
      if (deleteError) {
        console.log('⚠️ Cleanup error (not critical):', deleteError.message);
      } else {
        console.log('✅ Test data cleaned up');
      }
    }
    
    // Check available RPC functions
    console.log('\n🔍 Checking available RPC functions...');
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_user_profile_with_tasks', { user_id_param: 'test' });
    if (rpcError) {
      console.log('❌ get_user_profile_with_tasks not available:', rpcError.message);
    } else {
      console.log('✅ get_user_profile_with_tasks is available');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

debugSignupIssue().catch(console.error);