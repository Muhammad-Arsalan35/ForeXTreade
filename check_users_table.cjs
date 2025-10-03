const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function checkUsersTable() {
  console.log('🔍 Checking Users Table Structure');
  console.log('=' .repeat(50));

  try {
    // Test 1: Check if we can access the users table at all
    console.log('\n📋 Step 1: Testing basic table access...');
    const { data: testData, error: testError } = await supabaseAdmin
      .from('users')
      .select('*')
      .limit(1);

    if (testError) {
      console.error('❌ Cannot access users table:', testError.message);
      return;
    } else {
      console.log('✅ Users table accessible');
      console.log('   Current records:', testData?.length || 0);
    }

    // Test 2: Try to insert a minimal record
    console.log('\n👤 Step 2: Testing minimal record insertion...');
    const testUuid = '550e8400-e29b-41d4-a716-446655440000'; // Valid UUID format
    
    try {
      const { data: insertData, error: insertError } = await supabaseAdmin
        .from('users')
        .insert({
          auth_user_id: testUuid,
          full_name: 'Test User',
          username: 'testuser123',
          vip_level: 'Intern'
        })
        .select();

      if (insertError) {
        console.error('❌ Minimal insert failed:', insertError.message);
        console.error('   Details:', insertError.details);
        console.error('   Hint:', insertError.hint);
      } else {
        console.log('✅ Minimal insert successful:', insertData);
        
        // Clean up
        await supabaseAdmin
          .from('users')
          .delete()
          .eq('auth_user_id', testUuid);
        console.log('✅ Test record cleaned up');
      }
    } catch (err) {
      console.error('❌ Insert error:', err.message);
    }

    // Test 3: Check what columns are required
    console.log('\n📊 Step 3: Testing required columns...');
    const testUuid2 = '550e8400-e29b-41d4-a716-446655440001';
    
    // Try with just auth_user_id
    try {
      const { data: minimalData, error: minimalError } = await supabaseAdmin
        .from('users')
        .insert({
          auth_user_id: testUuid2
        })
        .select();

      if (minimalError) {
        console.log('⚠️ Minimal columns failed:', minimalError.message);
      } else {
        console.log('✅ Minimal columns worked:', minimalData);
        await supabaseAdmin.from('users').delete().eq('auth_user_id', testUuid2);
      }
    } catch (err) {
      console.log('⚠️ Minimal test error:', err.message);
    }

    // Test 4: Check existing users structure
    console.log('\n🔍 Step 4: Checking existing users...');
    const { data: existingUsers, error: existingError } = await supabaseAdmin
      .from('users')
      .select('auth_user_id, full_name, username, vip_level, created_at')
      .limit(3);

    if (existingError) {
      console.error('❌ Cannot fetch existing users:', existingError.message);
    } else {
      console.log('✅ Existing users sample:', existingUsers);
    }

  } catch (error) {
    console.error('❌ Check failed:', error.message);
  }

  console.log('\n' + '='.repeat(50));
  console.log('🏁 Users table check completed');
}

checkUsersTable().catch(console.error);