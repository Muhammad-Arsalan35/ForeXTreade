const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testSchemaStepByStep() {
  console.log('🔍 Testing schema application step by step...\n');
  
  try {
    // Test 1: Check if we can connect
    console.log('1. Testing connection...');
    const { data: connectionTest, error: connError } = await supabase.rpc('sql', {
      query: 'SELECT 1 as test;'
    });
    
    if (connError) {
      console.log('❌ Connection failed:', connError.message);
      console.log('💡 The sql RPC function is not available. You need to apply schema manually.');
      return;
    }
    console.log('✅ Connection successful\n');
    
    // Test 2: Try to create a simple table first
    console.log('2. Testing simple table creation...');
    const { data: tableTest, error: tableError } = await supabase.rpc('sql', {
      query: `
        DROP TABLE IF EXISTS test_table;
        CREATE TABLE test_table (id UUID PRIMARY KEY DEFAULT gen_random_uuid());
      `
    });
    
    if (tableError) {
      console.log('❌ Simple table creation failed:', tableError.message);
      return;
    }
    console.log('✅ Simple table creation successful\n');
    
    // Test 3: Try to create videos table specifically
    console.log('3. Testing videos table creation...');
    const { data: videosTest, error: videosError } = await supabase.rpc('sql', {
      query: `
        DROP TABLE IF EXISTS videos CASCADE;
        CREATE TABLE videos (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title VARCHAR(200) NOT NULL,
          description TEXT,
          video_url TEXT NOT NULL,
          thumbnail_url TEXT,
          duration INTEGER DEFAULT 30,
          category VARCHAR(50),
          is_active BOOLEAN DEFAULT TRUE,
          view_count INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });
    
    if (videosError) {
      console.log('❌ Videos table creation failed:', videosError.message);
      return;
    }
    console.log('✅ Videos table creation successful\n');
    
    // Test 4: Try to insert into videos table
    console.log('4. Testing videos table insert...');
    const { data: insertTest, error: insertError } = await supabase.rpc('sql', {
      query: `
        INSERT INTO videos (title, description, video_url, thumbnail_url, duration, category) VALUES
        ('Test Video', 'Test description', 'https://example.com/test.mp4', 'https://example.com/test.jpg', 30, 'test');
      `
    });
    
    if (insertError) {
      console.log('❌ Videos insert failed:', insertError.message);
      return;
    }
    console.log('✅ Videos insert successful\n');
    
    // Test 5: Check if sql RPC function exists
    console.log('5. Testing sql RPC function availability...');
    const { data: rpcTest, error: rpcError } = await supabase.rpc('sql', {
      query: 'SELECT 1 as test;'
    });
    
    if (rpcError) {
      console.log('❌ SQL RPC function not available:', rpcError.message);
      console.log('💡 You may need to apply the schema manually through Supabase Dashboard');
      return;
    }
    console.log('✅ SQL RPC function available\n');
    
    console.log('🎉 All tests passed! The issue might be in the full schema.');
    console.log('💡 Try applying the schema in smaller chunks through Supabase Dashboard.');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

testSchemaStepByStep();