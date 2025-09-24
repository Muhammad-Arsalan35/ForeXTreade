const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read Supabase config
const supabaseUrl = 'https://npliuqbormakkyggcgtw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wbGl1cWJvcm1ha2t5Z2djZ3R3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjY5NzQ4MCwiZXhwIjoyMDUyMjc0NDgwfQ.8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigrations() {
  try {
    console.log('Running database migrations...');
    
    // Read the SQL file
    const sql = fs.readFileSync('create_missing_tables.sql', 'utf8');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('Error running migrations:', error);
    } else {
      console.log('Migrations completed successfully!');
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

runMigrations();