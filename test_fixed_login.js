// Test the fixed login with correct email format
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://woiccythjszfhbypacaa.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvaWNjeXRoanN6ZmhieXBhY2FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0ODIzNDYsImV4cCI6MjA3NDA1ODM0Nn0.TkSPiZDpS4wFORklYUEiOIhy3E5Q41-XTMj1btQKe_k";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testFixedLogin() {
  const phone = "923001234568";
  const password = "TestPass123!";
  
  console.log('🔐 Testing Fixed Login Flow');
  console.log('─'.repeat(40));
  
  // Simulate the exact logic from Login.tsx
  const formattedPhone = phone.startsWith('+') ? phone : `+92${phone.substring(2)}`;
  const emailFormat = `${phone.replace(/\D/g, '')}@forextrade.com`;
  
  console.log('📱 Input phone:', phone);
  console.log('📱 Formatted phone:', formattedPhone);
  console.log('📧 Email format:', emailFormat);
  console.log('🔑 Password:', password ? '***' : '(empty)');
  
  try {
    console.log('\n🚀 Attempting login...');
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailFormat,
      password: password
    });

    if (error) {
      console.log('❌ Login failed:', error.message);
      console.log('   Error code:', error.status || 'N/A');
      return false;
    }

    if (data.user) {
      console.log('✅ Login successful!');
      console.log('   User ID:', data.user.id);
      console.log('   Email:', data.user.email);
      console.log('   Phone:', data.user.phone || 'N/A');
      console.log('   Created:', data.user.created_at);
      
      // Sign out
      await supabase.auth.signOut();
      console.log('🚪 Signed out successfully');
      
      return true;
    }
  } catch (err) {
    console.log('❌ Exception:', err.message);
    return false;
  }
}

// Run the test
testFixedLogin().then(success => {
  console.log('\n🏁 Test Result:', success ? '✅ SUCCESS' : '❌ FAILED');
});