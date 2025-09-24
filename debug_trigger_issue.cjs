const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function debugTriggerIssue() {
  console.log('🔍 Debugging trigger issue...\n');

  try {
    // Check if trigger exists using raw SQL
    console.log('1. Checking if trigger exists...');
    const { data: triggerCheck, error: triggerError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          trigger_name,
          event_manipulation,
          event_object_table,
          action_statement,
          action_timing
        FROM information_schema.triggers 
        WHERE trigger_name = 'on_auth_user_created';
      `
    });

    if (triggerError) {
      console.log('❌ Error checking trigger:', triggerError.message);
      
      // Try alternative method
      console.log('\n2. Trying alternative trigger check...');
      const { data: altCheck, error: altError } = await supabase
        .from('information_schema.triggers')
        .select('*')
        .eq('trigger_name', 'on_auth_user_created');
        
      if (altError) {
        console.log('❌ Alternative check failed:', altError.message);
      } else {
        console.log(`✅ Found ${altCheck?.length || 0} triggers via alternative method`);
      }
    } else {
      console.log(`✅ Found ${triggerCheck?.length || 0} triggers`);
      if (triggerCheck && triggerCheck.length > 0) {
        triggerCheck.forEach(trigger => {
          console.log(`   - Name: ${trigger.trigger_name}`);
          console.log(`   - Event: ${trigger.event_manipulation}`);
          console.log(`   - Table: ${trigger.event_object_table}`);
          console.log(`   - Timing: ${trigger.action_timing}`);
        });
      }
    }

    // Check if function exists
    console.log('\n3. Checking if trigger function exists...');
    const { data: functionCheck, error: functionError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          p.proname as function_name,
          n.nspname as schema_name
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
        AND p.proname = 'create_user_profile_from_auth';
      `
    });

    if (functionError) {
      console.log('❌ Error checking function:', functionError.message);
    } else {
      console.log(`✅ Found ${functionCheck?.length || 0} functions`);
      if (functionCheck && functionCheck.length > 0) {
        functionCheck.forEach(func => {
          console.log(`   - Function: ${func.schema_name}.${func.function_name}`);
        });
      }
    }

    // Check recent auth users and their corresponding records
    console.log('\n4. Checking recent auth users and corresponding records...');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.log('❌ Error fetching auth users:', authError.message);
    } else {
      const recentUsers = authUsers.users.slice(0, 3);
      console.log(`✅ Checking ${recentUsers.length} recent auth users:`);
      
      for (const authUser of recentUsers) {
        console.log(`\n   Auth User: ${authUser.id} (${authUser.email})`);
        
        // Check if user exists in users table
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('auth_user_id', authUser.id)
          .maybeSingle();
          
        if (userError) {
          console.log(`   ❌ Error checking user: ${userError.message}`);
        } else if (user) {
          console.log(`   ✅ User record exists: ${user.id} (${user.username})`);
        } else {
          console.log(`   ❌ No user record found`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

debugTriggerIssue();