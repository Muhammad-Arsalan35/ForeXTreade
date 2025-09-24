#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // Use service key for admin access
);

async function testTriggerDirectly() {
  console.log('🔧 TESTING TRIGGER FUNCTION DIRECTLY');
  console.log('====================================');
  
  const testUserId = 'test-user-' + Date.now();
  
  try {
    // 1. First, let's check if we can insert directly into auth.users (simulating what Supabase does)
    console.log('\n1. Testing direct insertion into auth.users...');
    
    // Note: We can't directly insert into auth.users, but we can test our trigger function
    // Let's test the trigger function manually
    
    console.log('\n2. Testing trigger function manually...');
    const { data: testResult, error: testError } = await supabase
      .rpc('sql', {
        query: `
          -- Create a test record to simulate what the trigger would receive
          DO $$
          DECLARE
            test_user_id UUID := gen_random_uuid();
            test_email TEXT := 'test_manual_${Date.now()}@example.com';
          BEGIN
            -- Simulate the trigger by calling our function logic directly
            PERFORM public.create_user_profile_from_auth();
            RAISE NOTICE 'Trigger function test completed';
          EXCEPTION
            WHEN OTHERS THEN
              RAISE NOTICE 'Error in trigger function: %', SQLERRM;
          END $$;
        `
      });
    
    if (testError) {
      console.log('❌ Error testing trigger function:', testError.message);
    } else {
      console.log('✅ Trigger function test result:', testResult);
    }

    // 3. Check current table structures
    console.log('\n3. Checking table structures...');
    const { data: usersColumns, error: usersError } = await supabase
      .rpc('sql', {
        query: `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = 'users' AND table_schema = 'public'
          ORDER BY ordinal_position;
        `
      });
    
    if (usersError) {
      console.log('❌ Error checking users table:', usersError.message);
    } else {
      console.log('✅ Users table columns:', usersColumns);
    }

    const { data: profilesColumns, error: profilesError } = await supabase
      .rpc('sql', {
        query: `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = 'user_profiles' AND table_schema = 'public'
          ORDER BY ordinal_position;
        `
      });
    
    if (profilesError) {
      console.log('❌ Error checking user_profiles table:', profilesError.message);
    } else {
      console.log('✅ User_profiles table columns:', profilesColumns);
    }

    // 4. Try a simple insert test
    console.log('\n4. Testing simple insert into users table...');
    const testUsername = 'test_user_' + Date.now();
    const { data: insertTest, error: insertError } = await supabase
      .from('users')
      .insert({
        id: testUserId,
        auth_id: testUserId,
        auth_user_id: testUserId,
        full_name: 'Test User',
        username: testUsername,
        vip_level: 'trial',
        position_title: 'Member',
        total_earnings: 0,
        referral_code: 'TEST123'
      })
      .select();
    
    if (insertError) {
      console.log('❌ Error inserting into users table:', insertError);
    } else {
      console.log('✅ Successfully inserted into users table:', insertTest);
      
      // Clean up
      await supabase.from('users').delete().eq('id', testUserId);
    }

  } catch (error) {
    console.log('❌ CRITICAL ERROR:', error);
  }
}

testTriggerDirectly().catch(console.error);