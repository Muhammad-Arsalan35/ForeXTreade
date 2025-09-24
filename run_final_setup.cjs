require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function runFinalSetup() {
  console.log('🚀 Running final comprehensive database setup...\n');

  try {
    // Read the SQL file
    const sqlContent = fs.readFileSync('final_complete_database_setup.sql', 'utf8');
    
    // Split the SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments and empty statements
      if (statement.startsWith('--') || statement.length < 10) {
        continue;
      }

      try {
        console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
        
        // Execute the statement
        const { data, error } = await supabase.rpc('exec_sql', {
          sql: statement + ';'
        });

        if (error) {
          console.log(`❌ Error in statement ${i + 1}:`, error.message);
          errorCount++;
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
          if (data && data.length > 0) {
            console.log('   Result:', JSON.stringify(data, null, 2));
          }
          successCount++;
        }
      } catch (err) {
        console.log(`❌ Exception in statement ${i + 1}:`, err.message);
        errorCount++;
      }

      // Small delay between statements
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n📊 Setup Summary:`);
    console.log(`   ✅ Successful statements: ${successCount}`);
    console.log(`   ❌ Failed statements: ${errorCount}`);
    console.log(`   📝 Total statements: ${successCount + errorCount}`);

    if (errorCount === 0) {
      console.log('\n🎉 Final database setup completed successfully!');
    } else {
      console.log('\n⚠️  Setup completed with some errors. Please review the output above.');
    }

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  }
}

runFinalSetup();