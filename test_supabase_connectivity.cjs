const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const { URL } = require('url');
require('dotenv').config();

async function testSupabaseConnectivity() {
  console.log('🔍 TESTING SUPABASE CONNECTIVITY...\n');

  // Check environment variables
  console.log('1️⃣ Checking environment variables...');
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  
  console.log(`   SUPABASE_URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`);
  console.log(`   SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✅ Set' : '❌ Missing'}`);
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('❌ Missing required environment variables');
    return;
  }

  // Test basic URL accessibility
  console.log('\n2️⃣ Testing basic URL accessibility...');
  try {
    const url = new URL(supabaseUrl);
    console.log(`   Testing connection to: ${url.hostname}`);
    
    await new Promise((resolve, reject) => {
      const req = https.get(`https://${url.hostname}`, (res) => {
        console.log(`   ✅ HTTP Status: ${res.statusCode}`);
        resolve();
      });
      
      req.on('error', (err) => {
        console.log(`   ❌ Connection failed: ${err.message}`);
        reject(err);
      });
      
      req.setTimeout(10000, () => {
        console.log('   ❌ Connection timeout');
        req.destroy();
        reject(new Error('Timeout'));
      });
    });
  } catch (error) {
    console.log(`   ❌ URL test failed: ${error.message}`);
  }

  // Test Supabase client initialization
  console.log('\n3️⃣ Testing Supabase client initialization...');
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('   ✅ Supabase client created successfully');

    // Test a simple query
    console.log('\n4️⃣ Testing simple database query...');
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (error) {
      console.log(`   ❌ Query failed: ${error.message}`);
      console.log(`   Error code: ${error.code}`);
      console.log(`   Error details:`, error);
    } else {
      console.log('   ✅ Database query successful');
    }

  } catch (error) {
    console.log(`   ❌ Supabase client test failed: ${error.message}`);
  }

  // Test auth endpoint specifically
  console.log('\n5️⃣ Testing auth endpoint...');
  try {
    const authUrl = `${supabaseUrl}/auth/v1/settings`;
    console.log(`   Testing: ${authUrl}`);
    
    const response = await fetch(authUrl, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    });
    
    console.log(`   ✅ Auth endpoint status: ${response.status}`);
  } catch (error) {
    console.log(`   ❌ Auth endpoint test failed: ${error.message}`);
  }
}

testSupabaseConnectivity().catch(console.error);