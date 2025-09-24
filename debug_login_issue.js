// Debug script to investigate login credentials issue
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://woiccythjszfhbypacaa.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvaWNjeXRoanN6ZmhieXBhY2FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0ODIzNDYsImV4cCI6MjA3NDA1ODM0Nn0.TkSPiZDpS4wFORklYUEiOIhy3E5Q41-XTMj1btQKe_k";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvaWNjeXRoanN6ZmhieXBhY2FhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQ4MjM0NiwiZXhwIjoyMDc0MDU4MzQ2fQ.F1_wsNmySrDhGlstpi3HbAZFWuzFioeGWYTdYA6zlU0";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function debugLoginIssue() {
  const phone = "923001234568";
  const password = "TestPass123!";
  
  console.log('🔍 Debugging Login Issue');
  console.log('Phone:', phone);
  console.log('Password:', password ? '***' : '(empty)');
  console.log('─'.repeat(50));

  // Step 1: Check different email formats
  const emailFormats = [
    `${phone}@forextrade.com`,
    `${phone}@fxtrade.app`,
    `+92${phone.substring(2)}@forextrade.com`,
    `+92${phone.substring(2)}@fxtrade.app`
  ];

  console.log('\n📧 Testing different email formats:');
  for (const email of emailFormats) {
    console.log(`\n🔐 Testing login with: ${email}`);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) {
        console.log(`❌ Error: ${error.message}`);
      } else {
        console.log(`✅ SUCCESS! User ID: ${data.user?.id}`);
        console.log(`   Email: ${data.user?.email}`);
        
        // Sign out immediately
        await supabase.auth.signOut();
        return { success: true, email, userId: data.user?.id };
      }
    } catch (err) {
      console.log(`❌ Exception: ${err.message}`);
    }
  }

  // Step 2: Check if user exists in database
  console.log('\n👤 Checking user existence in database:');
  
  try {
    const { data: users, error } = await supabaseService
      .from('users')
      .select('*')
      .or(`phone_number.eq.+${phone},phone_number.eq.${phone},phone_number.eq.+92${phone.substring(2)}`);

    if (error) {
      console.log('❌ Database query error:', error.message);
    } else {
      console.log(`📊 Found ${users.length} users with similar phone numbers:`);
      users.forEach((user, index) => {
        console.log(`\n${index + 1}. User ID: ${user.id}`);
        console.log(`   Auth User ID: ${user.auth_user_id}`);
        console.log(`   Phone: ${user.phone_number}`);
        console.log(`   Full Name: ${user.full_name}`);
        console.log(`   Username: ${user.username}`);
        console.log(`   Status: ${user.user_status}`);
      });
    }
  } catch (err) {
    console.log('❌ Database check failed:', err.message);
  }

  // Step 3: Check auth users table
  console.log('\n🔐 Checking auth.users table:');
  
  try {
    // Get all auth users (limited to recent ones)
    const { data: authUsers, error: authError } = await supabaseService.auth.admin.listUsers();
    
    if (authError) {
      console.log('❌ Auth users query error:', authError.message);
    } else {
      console.log(`📊 Total auth users: ${authUsers.users.length}`);
      
      // Look for users with matching emails
      const matchingUsers = authUsers.users.filter(user => 
        emailFormats.some(email => user.email === email)
      );
      
      console.log(`🎯 Matching users: ${matchingUsers.length}`);
      matchingUsers.forEach((user, index) => {
        console.log(`\n${index + 1}. Auth User:`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Phone: ${user.phone || 'N/A'}`);
        console.log(`   Email Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
        console.log(`   Created: ${user.created_at}`);
        console.log(`   Last Sign In: ${user.last_sign_in_at || 'Never'}`);
      });
    }
  } catch (err) {
    console.log('❌ Auth users check failed:', err.message);
  }

  // Step 4: Try to create a fresh test account
  console.log('\n🆕 Creating fresh test account:');
  
  const testEmail = `${phone}@fxtrade.app`;
  const testPhone = `+92${phone.substring(2)}`;
  
  try {
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: testEmail,
      password: password,
      options: {
        data: {
          phone_number: testPhone,
          full_name: 'Test User Debug',
          username: 'testdebug'
        }
      }
    });

    if (signupError) {
      if (signupError.message.includes('User already registered')) {
        console.log('✅ User already exists - this is expected');
        
        // Try to sign in again
        console.log('\n🔄 Retrying login with existing user:');
        const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
          email: testEmail,
          password: password
        });
        
        if (retryError) {
          console.log(`❌ Retry failed: ${retryError.message}`);
        } else {
          console.log(`✅ Retry SUCCESS! User ID: ${retryData.user?.id}`);
          await supabase.auth.signOut();
        }
      } else {
        console.log(`❌ Signup error: ${signupError.message}`);
      }
    } else {
      console.log(`✅ Fresh account created! User ID: ${signupData.user?.id}`);
      
      // Try to sign in with the fresh account
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: password
      });
      
      if (loginError) {
        console.log(`❌ Fresh login failed: ${loginError.message}`);
      } else {
        console.log(`✅ Fresh login SUCCESS! User ID: ${loginData.user?.id}`);
        await supabase.auth.signOut();
      }
    }
  } catch (err) {
    console.log('❌ Fresh account test failed:', err.message);
  }

  console.log('\n🏁 Debug complete!');
}

// Run the debug
debugLoginIssue();