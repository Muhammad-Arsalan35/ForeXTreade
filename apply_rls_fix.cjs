const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyRLSFix() {
  console.log('🔧 Applying RLS Policies Fix for Signin Issue');
  console.log('=' .repeat(50));

  try {
    // Read the RLS fix SQL file
    const sqlContent = fs.readFileSync('fix_rls_for_frontend.sql', 'utf8');
    
    console.log('📄 SQL file loaded successfully');
    console.log('📝 Applying RLS policies...');

    // Split the SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.includes('SELECT \'RLS policies updated')) {
        continue; // Skip the final status message
      }

      console.log(`\n📋 Executing statement ${i + 1}/${statements.length}...`);
      console.log(`Statement: ${statement.substring(0, 100)}${statement.length > 100 ? '...' : ''}`);

      try {
        const { data, error } = await supabase.rpc('exec', {
          sql: statement + ';'
        });

        if (error) {
          console.error(`❌ Error in statement ${i + 1}:`, error.message);
          errorCount++;
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
          successCount++;
        }
      } catch (err) {
        console.error(`❌ Exception in statement ${i + 1}:`, err.message);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 RLS Fix Application Summary:');
    console.log(`✅ Successful statements: ${successCount}`);
    console.log(`❌ Failed statements: ${errorCount}`);

    if (errorCount === 0) {
      console.log('🎉 All RLS policies applied successfully!');
    } else {
      console.log('⚠️ Some statements failed. Check the errors above.');
    }

    // Test the fix
    console.log('\n🧪 Testing the fix...');
    await testSigninAfterFix();

  } catch (error) {
    console.error('❌ Failed to apply RLS fix:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

async function testSigninAfterFix() {
  console.log('\n🔍 Testing signin after RLS fix...');
  
  const testEmail = `test_after_fix_${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';

  try {
    // Create client with anon key for testing
    const testClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

    // Test signup
    const { data: signUpData, error: signUpError } = await testClient.auth.signUp({
      email: testEmail,
      password: testPassword,
    });

    if (signUpError) {
      console.error('❌ Signup test failed:', signUpError.message);
      return;
    }

    console.log('✅ Signup test successful');

    // Wait for triggers
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Test signin
    const { data: signInData, error: signInError } = await testClient.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    if (signInError) {
      console.error('❌ Signin test failed:', signInError.message);
      return;
    }

    console.log('✅ Signin test successful');

    // Test profile access
    const { data: profileData, error: profileError } = await testClient
      .from('users')
      .select('*')
      .eq('auth_user_id', signUpData.user?.id);

    if (profileError) {
      console.error('❌ Profile access test failed:', profileError.message);
    } else {
      console.log('✅ Profile access test successful');
      console.log('Profile data:', profileData);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the fix
applyRLSFix().catch(console.error);