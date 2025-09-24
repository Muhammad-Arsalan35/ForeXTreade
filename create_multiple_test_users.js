// Script to create multiple test users
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://woiccythjszfhbypacaa.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvaWNjeXRoanN6ZmhieXBhY2FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0ODIzNDYsImV4cCI6MjA3NDA1ODM0Nn0.TkSPiZDpS4wFORklYUEiOIhy3E5Q41-XTMj1btQKe_k";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvaWNjeXRoanN6ZmhieXBhY2FhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQ4MjM0NiwiZXhwIjoyMDc0MDU4MzQ2fQ.F1_wsNmySrDhGlstpi3HbAZFWuzFioeGWYTdYA6zlU0";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Test users data
const testUsers = [
  {
    phone: '+923001234568',
    email: '923001234568@forextrade.com',
    password: 'TestPass123!',
    fullName: 'John Doe',
    username: 'johndoe'
  },
  {
    phone: '+923001234569',
    email: '923001234569@forextrade.com',
    password: 'TestPass123!',
    fullName: 'Jane Smith',
    username: 'janesmith'
  },
  {
    phone: '+923001234570',
    email: '923001234570@forextrade.com',
    password: 'TestPass123!',
    fullName: 'Mike Johnson',
    username: 'mikejohnson'
  },
  {
    phone: '+923001234571',
    email: '923001234571@forextrade.com',
    password: 'TestPass123!',
    fullName: 'Sarah Wilson',
    username: 'sarahwilson'
  },
  {
    phone: '+923001234572',
    email: '923001234572@forextrade.com',
    password: 'TestPass123!',
    fullName: 'David Brown',
    username: 'davidbrown'
  }
];

async function createTestUser(user, index) {
  console.log(`\n👤 Creating user ${index + 1}: ${user.fullName}`);
  
  try {
    // Step 1: Sign up
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: user.email,
      password: user.password,
      options: {
        data: {
          phone_number: user.phone,
          full_name: user.fullName,
          username: user.username
        }
      }
    });

    if (signupError) {
      if (signupError.message.includes('User already registered')) {
        console.log(`⚠️  User ${user.fullName} already exists`);
        return { success: true, message: 'User already exists' };
      }
      console.log(`❌ Signup failed for ${user.fullName}:`, signupError.message);
      return { success: false, error: signupError.message };
    }

    // Step 2: Create profile
    const { error: profileError } = await supabaseService
      .from('users')
      .insert({
        auth_user_id: signupData.user.id,
        full_name: user.fullName,
        username: user.username,
        phone_number: user.phone,
        vip_level: 'VIP1',
        user_status: 'active',
        referral_code: Math.floor(100000 + Math.random() * 900000).toString(),
        personal_wallet_balance: Math.floor(Math.random() * 1000), // Random balance for testing
        income_wallet_balance: Math.floor(Math.random() * 500),
        total_earnings: 0.00,
        total_invested: 0.00,
        position_title: 'Member',
        referred_by: null
      });

    if (profileError) {
      console.log(`❌ Profile creation failed for ${user.fullName}:`, profileError.message);
      return { success: false, error: profileError.message };
    }

    console.log(`✅ Successfully created ${user.fullName}`);
    return { success: true, userId: signupData.user.id };

  } catch (error) {
    console.log(`❌ Error creating ${user.fullName}:`, error.message);
    return { success: false, error: error.message };
  }
}

async function createAllTestUsers() {
  console.log('🚀 Creating multiple test users...\n');
  
  const results = [];
  
  for (let i = 0; i < testUsers.length; i++) {
    const result = await createTestUser(testUsers[i], i);
    results.push({ user: testUsers[i], result });
    
    // Small delay between creations
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log('\n📊 Summary:');
  const successful = results.filter(r => r.result.success).length;
  const failed = results.filter(r => !r.result.success).length;
  
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\nFailed users:');
    results.filter(r => !r.result.success).forEach(r => {
      console.log(`- ${r.user.fullName}: ${r.result.error}`);
    });
  }
  
  // Test login for first user
  if (successful > 0) {
    console.log('\n🔐 Testing login with first successful user...');
    const firstSuccessful = results.find(r => r.result.success);
    if (firstSuccessful) {
      await testLogin(firstSuccessful.user);
    }
  }
}

async function testLogin(user) {
  try {
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: user.password
    });

    if (loginError) {
      console.log('❌ Login failed:', loginError.message);
      return;
    }

    console.log(`✅ Login successful for ${user.fullName}!`);
    console.log('User ID:', loginData.user?.id);
    
    // Test getting user count
    const { data: userCount, error: countError } = await supabaseService
      .from('users')
      .select('id', { count: 'exact' });
    
    if (!countError) {
      console.log(`📊 Total users in database: ${userCount.length}`);
    }
    
  } catch (error) {
    console.log('❌ Login test failed:', error.message);
  }
}

// Run the script
createAllTestUsers();