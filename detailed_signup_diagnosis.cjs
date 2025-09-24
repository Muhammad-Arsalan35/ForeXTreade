#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function detailedSignupDiagnosis() {
  console.log('🔍 DETAILED SIGNUP DIAGNOSIS');
  console.log('============================');
  
  const testEmail = `test_diagnosis_${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  
  console.log(`📧 Test email: ${testEmail}`);
  
  try {
    // 1. Check current trigger status
    console.log('\n1. Checking trigger status...');
    const { data: triggerCheck, error: triggerError } = await supabase
      .rpc('sql', { 
        query: `
          SELECT 
            tgname, 
            tgenabled,
            pg_get_triggerdef(oid) as definition
          FROM pg_trigger 
          WHERE tgname = 'on_auth_user_created';
        `
      });
    
    if (triggerError) {
      console.log('❌ Error checking trigger:', triggerError.message);
    } else {
      console.log('✅ Trigger status:', triggerCheck);
    }

    // 2. Check function status
    console.log('\n2. Checking function status...');
    const { data: functionCheck, error: functionError } = await supabase
      .rpc('sql', { 
        query: `
          SELECT 
            proname,
            prosrc
          FROM pg_proc 
          WHERE proname = 'create_user_profile_from_auth';
        `
      });
    
    if (functionError) {
      console.log('❌ Error checking function:', functionError.message);
    } else {
      console.log('✅ Function exists:', functionCheck?.length > 0);
    }

    // 3. Check RLS policies
    console.log('\n3. Checking RLS policies...');
    const { data: rlsCheck, error: rlsError } = await supabase
      .rpc('sql', { 
        query: `
          SELECT 
            schemaname,
            tablename,
            policyname,
            permissive,
            roles,
            cmd,
            qual,
            with_check
          FROM pg_policies 
          WHERE tablename IN ('users', 'user_profiles');
        `
      });
    
    if (rlsError) {
      console.log('❌ Error checking RLS:', rlsError.message);
    } else {
      console.log('✅ RLS policies:', rlsCheck);
    }

    // 4. Attempt signup with detailed error capture
    console.log('\n4. Attempting signup...');
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Test Diagnosis User'
        }
      }
    });

    if (signupError) {
      console.log('❌ SIGNUP ERROR:', signupError);
      console.log('Error details:', {
        message: signupError.message,
        status: signupError.status,
        statusText: signupError.statusText
      });
    } else {
      console.log('✅ Signup successful!');
      console.log('User data:', signupData.user);
      
      // 5. Check if user record was created
      console.log('\n5. Checking user record creation...');
      const { data: userRecord, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', signupData.user.id)
        .single();
      
      if (userError) {
        console.log('❌ User record not found:', userError.message);
      } else {
        console.log('✅ User record created:', userRecord);
      }
      
      // 6. Check if user profile was created
      console.log('\n6. Checking user profile creation...');
      const { data: profileRecord, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userRecord?.id)
        .single();
      
      if (profileError) {
        console.log('❌ User profile not found:', profileError.message);
      } else {
        console.log('✅ User profile created:', profileRecord);
      }
    }

    // 7. Check recent auth users
    console.log('\n7. Checking recent auth users...');
    const { data: recentUsers, error: recentError } = await supabase
      .rpc('sql', { 
        query: `
          SELECT 
            au.id as auth_id,
            au.email,
            au.created_at as auth_created,
            u.id as user_id,
            u.username,
            up.id as profile_id
          FROM auth.users au
          LEFT JOIN public.users u ON au.id = u.auth_id
          LEFT JOIN public.user_profiles up ON u.id = up.user_id
          WHERE au.created_at > NOW() - INTERVAL '1 hour'
          ORDER BY au.created_at DESC
          LIMIT 10;
        `
      });
    
    if (recentError) {
      console.log('❌ Error checking recent users:', recentError.message);
    } else {
      console.log('✅ Recent users (last hour):', recentUsers);
    }

  } catch (error) {
    console.log('❌ CRITICAL ERROR:', error);
  }
}

detailedSignupDiagnosis().catch(console.error);