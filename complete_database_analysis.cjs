const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function completeDatabaseAnalysis() {
  console.log('🔍 COMPREHENSIVE DATABASE ANALYSIS');
  console.log('=====================================\n');

  const issues = [];
  const recommendations = [];

  try {
    // 1. Check table existence and structure
    console.log('1. 📋 CHECKING TABLE STRUCTURES...');
    const expectedTables = ['users', 'user_profiles', 'membership_plans', 'task_completions'];
    
    for (const tableName of expectedTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
          
        if (error) {
          console.log(`   ❌ Table '${tableName}': ${error.message}`);
          issues.push(`Table '${tableName}' has issues: ${error.message}`);
        } else {
          console.log(`   ✅ Table '${tableName}': Accessible`);
        }
      } catch (err) {
        console.log(`   ❌ Table '${tableName}': ${err.message}`);
        issues.push(`Table '${tableName}' error: ${err.message}`);
      }
    }

    // 2. Check users table structure
    console.log('\n2. 👤 CHECKING USERS TABLE STRUCTURE...');
    try {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .limit(1);
        
      if (usersError) {
        console.log(`   ❌ Users table error: ${usersError.message}`);
        issues.push(`Users table: ${usersError.message}`);
      } else {
        console.log('   ✅ Users table is accessible');
        if (users && users.length > 0) {
          const userColumns = Object.keys(users[0]);
          console.log(`   📝 Columns: ${userColumns.join(', ')}`);
          
          // Check for required columns
          const requiredColumns = ['id', 'auth_user_id', 'username', 'vip_level'];
          const missingColumns = requiredColumns.filter(col => !userColumns.includes(col));
          if (missingColumns.length > 0) {
            console.log(`   ⚠️ Missing columns: ${missingColumns.join(', ')}`);
            issues.push(`Users table missing columns: ${missingColumns.join(', ')}`);
          }
        }
      }
    } catch (err) {
      console.log(`   ❌ Users table check failed: ${err.message}`);
      issues.push(`Users table check failed: ${err.message}`);
    }

    // 3. Check user_profiles table structure
    console.log('\n3. 👥 CHECKING USER_PROFILES TABLE STRUCTURE...');
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('*')
        .limit(1);
        
      if (profilesError) {
        console.log(`   ❌ User_profiles table error: ${profilesError.message}`);
        issues.push(`User_profiles table: ${profilesError.message}`);
      } else {
        console.log('   ✅ User_profiles table is accessible');
        if (profiles && profiles.length > 0) {
          const profileColumns = Object.keys(profiles[0]);
          console.log(`   📝 Columns: ${profileColumns.join(', ')}`);
        }
      }
    } catch (err) {
      console.log(`   ❌ User_profiles table check failed: ${err.message}`);
      issues.push(`User_profiles table check failed: ${err.message}`);
    }

    // 4. Check authentication flow
    console.log('\n4. 🔐 CHECKING AUTHENTICATION FLOW...');
    try {
      // Test signup
      const testEmail = `test_analysis_${Date.now()}@example.com`;
      console.log(`   🧪 Testing signup with: ${testEmail}`);
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: testEmail,
        password: 'TestPassword123!',
        options: {
          data: {
            full_name: 'Test User'
          }
        }
      });

      if (authError) {
        console.log(`   ❌ Auth signup failed: ${authError.message}`);
        issues.push(`Auth signup: ${authError.message}`);
      } else {
        console.log('   ✅ Auth signup successful');
        
        // Wait and check if user was created in users table
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const { data: newUser, error: userCheckError } = await supabase
          .from('users')
          .select('*')
          .eq('auth_user_id', authData.user.id)
          .maybeSingle();
          
        if (userCheckError) {
          console.log(`   ❌ User creation check failed: ${userCheckError.message}`);
          issues.push(`User creation check: ${userCheckError.message}`);
        } else if (newUser) {
          console.log('   ✅ User record created successfully');
          
          // Check user profile
          const { data: newProfile, error: profileCheckError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', newUser.id)
            .maybeSingle();
            
          if (profileCheckError) {
            console.log(`   ❌ Profile creation check failed: ${profileCheckError.message}`);
            issues.push(`Profile creation check: ${profileCheckError.message}`);
          } else if (newProfile) {
            console.log('   ✅ User profile created successfully');
          } else {
            console.log('   ❌ User profile was not created');
            issues.push('User profile not created by trigger');
          }
        } else {
          console.log('   ❌ User record was not created');
          issues.push('User record not created by trigger');
        }
      }
    } catch (err) {
      console.log(`   ❌ Auth flow test failed: ${err.message}`);
      issues.push(`Auth flow test: ${err.message}`);
    }

    // 5. Check triggers and functions
    console.log('\n5. ⚙️ CHECKING TRIGGERS AND FUNCTIONS...');
    try {
      // Check recent auth users vs users table
      const { data: authUsers, error: authUsersError } = await supabase.auth.admin.listUsers();
      
      if (authUsersError) {
        console.log(`   ❌ Cannot access auth users: ${authUsersError.message}`);
        issues.push(`Auth users access: ${authUsersError.message}`);
      } else {
        const recentAuthUsers = authUsers.users.slice(0, 5);
        console.log(`   📊 Checking ${recentAuthUsers.length} recent auth users...`);
        
        let matchedUsers = 0;
        for (const authUser of recentAuthUsers) {
          const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('auth_user_id', authUser.id)
            .maybeSingle();
            
          if (!userError && user) {
            matchedUsers++;
          }
        }
        
        console.log(`   📈 ${matchedUsers}/${recentAuthUsers.length} auth users have corresponding user records`);
        
        if (matchedUsers < recentAuthUsers.length) {
          issues.push(`${recentAuthUsers.length - matchedUsers} auth users missing user records - trigger may not be working`);
        }
      }
    } catch (err) {
      console.log(`   ❌ Trigger check failed: ${err.message}`);
      issues.push(`Trigger check: ${err.message}`);
    }

    // 6. Check RLS policies
    console.log('\n6. 🔒 CHECKING RLS POLICIES...');
    try {
      // Test if RLS is blocking legitimate access
      const { data: testUsers, error: rlsError } = await supabase
        .from('users')
        .select('id, username')
        .limit(1);
        
      if (rlsError && rlsError.message.includes('RLS')) {
        console.log(`   ⚠️ RLS may be too restrictive: ${rlsError.message}`);
        issues.push(`RLS policy issue: ${rlsError.message}`);
      } else {
        console.log('   ✅ RLS policies allow service key access');
      }
    } catch (err) {
      console.log(`   ❌ RLS check failed: ${err.message}`);
      issues.push(`RLS check: ${err.message}`);
    }

    // 7. Summary and recommendations
    console.log('\n📋 ANALYSIS SUMMARY');
    console.log('===================');
    
    if (issues.length === 0) {
      console.log('✅ No issues found! Database appears to be working correctly.');
    } else {
      console.log(`❌ Found ${issues.length} issues:`);
      issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
      
      console.log('\n💡 RECOMMENDATIONS:');
      
      if (issues.some(issue => issue.includes('trigger'))) {
        console.log('   🔧 Recreate trigger function with proper error handling');
        recommendations.push('recreate_trigger');
      }
      
      if (issues.some(issue => issue.includes('Table'))) {
        console.log('   📋 Fix table structure issues');
        recommendations.push('fix_tables');
      }
      
      if (issues.some(issue => issue.includes('Auth'))) {
        console.log('   🔐 Fix authentication configuration');
        recommendations.push('fix_auth');
      }
      
      if (issues.some(issue => issue.includes('RLS'))) {
        console.log('   🔒 Adjust RLS policies');
        recommendations.push('fix_rls');
      }
    }

    return { issues, recommendations };

  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    return { issues: [`Analysis failed: ${error.message}`], recommendations: ['full_reset'] };
  }
}

completeDatabaseAnalysis().then(result => {
  console.log('\n🎯 NEXT STEPS:');
  if (result.recommendations.length > 0) {
    console.log('   Based on the analysis, we need to:');
    result.recommendations.forEach(rec => {
      switch(rec) {
        case 'recreate_trigger':
          console.log('   - Recreate the trigger function');
          break;
        case 'fix_tables':
          console.log('   - Fix table structures');
          break;
        case 'fix_auth':
          console.log('   - Fix authentication setup');
          break;
        case 'fix_rls':
          console.log('   - Adjust RLS policies');
          break;
        case 'full_reset':
          console.log('   - Perform complete database reset');
          break;
      }
    });
  } else {
    console.log('   Database appears to be working correctly!');
  }
});