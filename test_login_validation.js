// Test login validation with provided credentials
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://woiccythjszfhbypacaa.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvaWNjeXRoanN6ZmhieXBhY2FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0ODIzNDYsImV4cCI6MjA3NDA1ODM0Nn0.TkSPiZDpS4wFORklYUEiOIhy3E5Q41-XTMj1btQKe_k";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testLoginValidation() {
  console.log('🔐 Testing Login Validation\n');
  
  // Test cases
  const testCases = [
    {
      name: "Valid credentials (existing user)",
      phone: "923001234568",
      email: "923001234568@forextrade.com",
      password: "TestPass123!"
    },
    {
      name: "Invalid phone format",
      phone: "923001234568", // Without +
      email: "invalid@test.com",
      password: "TestPass123!"
    },
    {
      name: "Wrong password",
      phone: "+923001234568",
      email: "923001234568@forextrade.com",
      password: "WrongPassword123!"
    },
    {
      name: "Non-existent user",
      phone: "+923009999999",
      email: "nonexistent@test.com",
      password: "TestPass123!"
    },
    {
      name: "Empty credentials",
      phone: "",
      email: "",
      password: ""
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n📱 Testing: ${testCase.name}`);
    console.log(`Phone: ${testCase.phone}`);
    console.log(`Email: ${testCase.email}`);
    console.log(`Password: ${testCase.password ? '***' : '(empty)'}`);
    
    try {
      // Test with email login
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: testCase.email,
        password: testCase.password
      });

      if (loginError) {
        console.log(`❌ Login Error: ${loginError.message}`);
        console.log(`   Error Code: ${loginError.status || 'N/A'}`);
      } else {
        console.log(`✅ Login Successful!`);
        console.log(`   User ID: ${loginData.user?.id}`);
        console.log(`   Email: ${loginData.user?.email}`);
        
        // Sign out after successful login
        await supabase.auth.signOut();
        console.log(`   Signed out successfully`);
      }
    } catch (error) {
      console.log(`❌ Exception: ${error.message}`);
    }
    
    console.log('─'.repeat(50));
  }
  
  // Test phone number validation patterns
  console.log('\n📞 Testing Phone Number Validation Patterns:');
  
  const phoneTests = [
    "+923001234568", // Valid
    "923001234568",  // Missing +
    "+92300123456",  // Too short
    "+9230012345678", // Too long
    "+1234567890",   // Wrong country code
    "abc123456789",  // Invalid characters
    "",              // Empty
  ];
  
  phoneTests.forEach(phone => {
    const isValid = /^\+92[0-9]{10}$/.test(phone);
    console.log(`${phone.padEnd(15)} -> ${isValid ? '✅ Valid' : '❌ Invalid'}`);
  });
}

// Run the test
testLoginValidation();