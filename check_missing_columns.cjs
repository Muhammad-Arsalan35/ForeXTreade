const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function checkMissingColumns() {
  console.log('🔍 Checking Users Table Schema vs Frontend Expectations');
  console.log('=' .repeat(60));

  try {
    // Test 1: Check current table structure by trying to select all columns
    console.log('\n📋 Step 1: Checking current users table structure...');
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .limit(1);

    if (userError) {
      console.error('❌ Cannot access users table:', userError.message);
      return;
    }

    if (userData && userData.length > 0) {
      console.log('✅ Current users table columns:');
      Object.keys(userData[0]).forEach(column => {
        console.log(`   - ${column}`);
      });
    } else {
      console.log('⚠️ No users found, checking with empty select...');
    }

    // Test 2: Try to access the specific column that's causing the error
    console.log('\n🔍 Step 2: Testing specific problematic columns...');
    
    const problematicColumns = [
      'position_title',
      'company_name', 
      'work_experience',
      'education_level',
      'bio'
    ];

    for (const column of problematicColumns) {
      try {
        const { data, error } = await supabaseAdmin
          .from('users')
          .select(column)
          .limit(1);

        if (error) {
          console.log(`❌ Column '${column}' missing: ${error.message}`);
        } else {
          console.log(`✅ Column '${column}' exists`);
        }
      } catch (err) {
        console.log(`❌ Column '${column}' error: ${err.message}`);
      }
    }

    // Test 3: Check what the frontend might be expecting
    console.log('\n📱 Step 3: Frontend expectations analysis...');
    console.log('The error suggests the frontend is trying to access:');
    console.log('   - position_title (missing)');
    console.log('   - Possibly other profile-related columns');

  } catch (error) {
    console.error('❌ Schema check failed:', error.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('🏁 Schema check completed');
}

checkMissingColumns().catch(console.error);