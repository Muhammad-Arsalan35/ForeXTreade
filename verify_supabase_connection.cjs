const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function verifySupabaseConnection() {
  console.log('🔍 Verifying Supabase Connection and Environment');
  console.log('=' .repeat(60));

  // Check environment variables
  console.log('\n📋 Environment Variables:');
  console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing');
  console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing');
  console.log('SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '✅ Set' : '❌ Missing');

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.error('❌ Missing required environment variables');
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  // Test anon client connection
  console.log('\n🔗 Testing Anon Client Connection:');
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Anon client error:', error.message);
    } else {
      console.log('✅ Anon client connected successfully');
    }
  } catch (err) {
    console.error('❌ Anon client connection failed:', err.message);
  }

  // Test service client connection
  if (supabaseServiceKey) {
    console.log('\n🔗 Testing Service Client Connection:');
    try {
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
      
      // Try a simple query that should work with service role
      const { data, error } = await supabaseAdmin
        .from('auth.users')
        .select('count')
        .limit(1);
      
      if (error) {
        console.log('⚠️ Service client auth.users access:', error.message);
        
        // Try a different approach - check if we can access public schema
        const { data: publicData, error: publicError } = await supabaseAdmin.rpc('sql', {
          query: 'SELECT current_user, session_user;'
        });
        
        if (publicError) {
          console.error('❌ Service client SQL access failed:', publicError.message);
        } else {
          console.log('✅ Service client SQL access works:', publicData);
        }
      } else {
        console.log('✅ Service client connected and can access auth.users');
      }
    } catch (err) {
      console.error('❌ Service client connection failed:', err.message);
    }
  }

  // Test basic auth functionality
  console.log('\n🔐 Testing Basic Auth Functionality:');
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Try to get current user (should be null but shouldn't error)
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('❌ Auth getUser failed:', error.message);
    } else {
      console.log('✅ Auth getUser works (user:', user ? 'logged in' : 'not logged in', ')');
    }
  } catch (err) {
    console.error('❌ Auth functionality test failed:', err.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('🏁 Connection verification completed');
  console.log('\n💡 Next steps:');
  console.log('1. If connections are working, run the updated direct_rls_fix.sql in Supabase SQL Editor');
  console.log('2. The script includes comprehensive permissions for both authenticated and service roles');
  console.log('3. After running the SQL, test signup again with: node final_signin_test.cjs');
}

verifySupabaseConnection().catch(console.error);