const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function checkUsersSchema() {
  console.log('🔍 CHECKING USERS TABLE SCHEMA...\n');
  
  try {
    // Try to get one user record to see the structure
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('❌ Error:', error);
      return;
    }
    
    if (data && data.length > 0) {
      console.log('📋 Users table columns found:');
      const columns = Object.keys(data[0]);
      columns.forEach(col => {
        console.log(`   - ${col}: ${typeof data[0][col]}`);
      });
      
      // Check if there are any admin-related fields
      const adminFields = columns.filter(col => 
        col.toLowerCase().includes('admin') || 
        col.toLowerCase().includes('role') ||
        col.toLowerCase().includes('position') ||
        col.toLowerCase().includes('status')
      );
      
      console.log('\n🔑 Admin/Role-related fields found:');
      if (adminFields.length > 0) {
        adminFields.forEach(field => {
          console.log(`   - ${field}: ${data[0][field]}`);
        });
      } else {
        console.log('   - No admin/role-related fields found');
      }
      
      // Show some key fields that might be useful
      console.log('\n📊 Key fields for admin checking:');
      const keyFields = ['id', 'username', 'vip_level', 'user_status'];
      keyFields.forEach(field => {
        if (columns.includes(field)) {
          console.log(`   - ${field}: ${data[0][field]}`);
        }
      });
      
    } else {
      console.log('📋 No users found in the table');
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

checkUsersSchema();