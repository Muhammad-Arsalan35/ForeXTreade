#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkActualSchema() {
  console.log('🔍 CHECKING ACTUAL TABLE SCHEMA');
  console.log('===============================');
  
  try {
    // 1. Check what columns actually exist in users table
    console.log('\n1. Checking users table structure...');
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (usersError) {
      console.log('❌ Error querying users table:', usersError);
    } else {
      console.log('✅ Users table exists. Sample data structure:');
      if (usersData && usersData.length > 0) {
        console.log('Columns found:', Object.keys(usersData[0]));
      } else {
        console.log('Table is empty, but exists');
      }
    }

    // 2. Check what columns actually exist in user_profiles table
    console.log('\n2. Checking user_profiles table structure...');
    const { data: profilesData, error: profilesError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1);
    
    if (profilesError) {
      console.log('❌ Error querying user_profiles table:', profilesError);
    } else {
      console.log('✅ User_profiles table exists. Sample data structure:');
      if (profilesData && profilesData.length > 0) {
        console.log('Columns found:', Object.keys(profilesData[0]));
      } else {
        console.log('Table is empty, but exists');
      }
    }

    // 3. Try to insert with minimal required fields
    console.log('\n3. Testing minimal insert into users table...');
    const testId = 'test-' + Date.now();
    
    // First, let's try with just basic fields
    const { data: minimalInsert, error: minimalError } = await supabase
      .from('users')
      .insert({
        id: testId,
        username: 'test_user_' + Date.now(),
        vip_level: 'trial'
      })
      .select();
    
    if (minimalError) {
      console.log('❌ Error with minimal insert:', minimalError);
    } else {
      console.log('✅ Minimal insert successful:', minimalInsert);
      
      // Clean up
      await supabase.from('users').delete().eq('id', testId);
    }

    // 4. Check if there are any existing users to see the actual structure
    console.log('\n4. Checking existing users for actual column structure...');
    const { data: existingUsers, error: existingError } = await supabase
      .from('users')
      .select('*')
      .limit(3);
    
    if (existingError) {
      console.log('❌ Error querying existing users:', existingError);
    } else {
      console.log('✅ Existing users found:', existingUsers?.length || 0);
      if (existingUsers && existingUsers.length > 0) {
        console.log('Actual column structure:', Object.keys(existingUsers[0]));
        console.log('Sample user:', existingUsers[0]);
      }
    }

  } catch (error) {
    console.log('❌ CRITICAL ERROR:', error);
  }
}

checkActualSchema().catch(console.error);