require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabaseStructure() {
  console.log('🔍 Checking database structure...\n');
  
  try {
    // Check users table
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, auth_user_id, full_name, username, phone_number')
      .limit(5);
    
    if (usersError) {
      console.log('❌ Error accessing users table:', usersError);
      return false;
    }
    
    console.log(`✅ Found ${usersData.length} users in users table`);
    
    // Check user_profiles table
    const { data: profilesData, error: profilesError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(5);
    
    if (profilesError) {
      console.log('❌ Error accessing user_profiles table:', profilesError);
      return false;
    }
    
    console.log(`✅ Found ${profilesData.length} user profiles`);
    
    // Check membership_plans table
    const { data: plansData, error: plansError } = await supabase
      .from('membership_plans')
      .select('id, name')
      .eq('name', 'Intern');
    
    if (plansError) {
      console.log('❌ Error accessing membership_plans table:', plansError);
      return false;
    }
    
    if (plansData.length === 0) {
      console.log('❌ No "Intern" membership plan found');
      return false;
    }
    
    console.log(`✅ Found Intern membership plan: ${plansData[0].id}`);
    return { users: usersData, profiles: profilesData, internPlan: plansData[0] };
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

async function fixUserProfiles(dbData) {
  console.log('\n🔧 Fixing user profiles...\n');
  
  const { users, internPlan } = dbData;
  let created = 0;
  let existing = 0;
  let errors = 0;
  
  for (const user of users) {
    try {
      // Check if profile already exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (existingProfile) {
        console.log(`✅ Profile already exists for user ${user.username || user.id}`);
        existing++;
        continue;
      }
      
      // Create new profile with correct structure
      const { data: newProfile, error: createError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: user.id,
          full_name: user.full_name,
          username: user.username,
          phone_number: user.phone_number,
          membership_type: 'intern',  // Using correct column name
          membership_level: 'Intern', // Using correct column name
          is_trial_active: true,
          trial_start_date: new Date().toISOString().split('T')[0],
          trial_end_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        })
        .select()
        .single();
      
      if (createError) {
        console.log(`❌ Error creating profile for user ${user.username || user.id}:`, createError);
        errors++;
      } else {
        console.log(`✅ Created profile for user ${user.username || user.id}`);
        created++;
        
        // Also create entry in user_plans table
        const { error: planError } = await supabase
          .from('user_plans')
          .insert({
            user_id: user.id,
            plan_id: internPlan.id,
            status: 'active',
            is_active: true
          });
        
        if (planError) {
          console.log(`⚠️ Warning: Could not create user_plan entry for ${user.username || user.id}:`, planError);
        } else {
          console.log(`✅ Created user_plan entry for ${user.username || user.id}`);
        }
      }
      
    } catch (error) {
      console.log(`❌ Unexpected error for user ${user.username || user.id}:`, error);
      errors++;
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   - Profiles created: ${created}`);
  console.log(`   - Profiles already existing: ${existing}`);
  console.log(`   - Errors: ${errors}`);
  console.log(`   - Total users processed: ${users.length}`);
}

async function generateTriggerSQL() {
  console.log('\n📝 Generating trigger SQL...\n');
  
  const triggerSQL = `-- ============================================================================
-- USER PROFILE TRIGGER FIX
-- ============================================================================
-- This SQL creates a trigger to automatically create user profiles when
-- new users sign up through Supabase Auth

-- 1. Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION create_user_profile_from_auth()
RETURNS TRIGGER AS $$
DECLARE
    intern_plan_id UUID;
    new_user_id UUID;
BEGIN
    -- Get the Intern membership plan ID
    SELECT id INTO intern_plan_id 
    FROM membership_plans 
    WHERE name = 'Intern' 
    LIMIT 1;
    
    -- Insert into public.users table first
    INSERT INTO public.users (
        auth_user_id,
        full_name,
        username,
        phone_number,
        referral_code,
        user_status
    ) VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
        COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
        COALESCE(NEW.raw_user_meta_data->>'phone_number', NEW.phone),
        UPPER(substr(gen_random_uuid()::text, 1, 8)),
        'active'
    ) RETURNING id INTO new_user_id;
    
    -- Create user profile with correct column names
    INSERT INTO public.user_profiles (
        user_id,
        full_name,
        username,
        phone_number,
        membership_type,
        membership_level,
        is_trial_active,
        trial_start_date,
        trial_end_date
    ) VALUES (
        new_user_id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
        COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
        COALESCE(NEW.raw_user_meta_data->>'phone_number', NEW.phone),
        'intern',
        'Intern',
        true,
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '3 days'
    );
    
    -- Create user plan entry
    IF intern_plan_id IS NOT NULL THEN
        INSERT INTO public.user_plans (
            user_id,
            plan_id,
            status,
            is_active
        ) VALUES (
            new_user_id,
            intern_plan_id,
            'active',
            true
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_user_profile_from_auth();

-- 3. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON membership_plans TO authenticated;
GRANT INSERT ON user_profiles TO authenticated;
GRANT INSERT ON users TO authenticated;
GRANT INSERT ON user_plans TO authenticated;

-- 4. Enable RLS policies if needed
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_plans ENABLE ROW LEVEL SECURITY;

-- Create policy for profile creation during signup
DROP POLICY IF EXISTS "Allow profile creation during signup" ON user_profiles;
CREATE POLICY "Allow profile creation during signup" ON user_profiles
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow user_plan creation during signup" ON user_plans;
CREATE POLICY "Allow user_plan creation during signup" ON user_plans
    FOR INSERT WITH CHECK (true);

-- ============================================================================
-- SETUP COMPLETE!
-- ============================================================================
`;

  fs.writeFileSync('user_profile_trigger.sql', triggerSQL);
  console.log('✅ Created user_profile_trigger.sql file');
  console.log('   Execute this SQL in your Supabase dashboard to set up the trigger');
}

async function testCurrentState() {
  console.log('\n🧪 Testing current state...\n');
  
  try {
    // Count user profiles
    const { count: profileCount, error: profileError } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true });
    
    if (profileError) {
      console.log('❌ Error counting profiles:', profileError);
    } else {
      console.log(`✅ Total user profiles: ${profileCount}`);
    }
    
    // Count users
    const { count: userCount, error: userError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    if (userError) {
      console.log('❌ Error counting users:', userError);
    } else {
      console.log(`✅ Total users: ${userCount}`);
    }
    
    // List membership plans
    const { data: plans, error: plansError } = await supabase
      .from('membership_plans')
      .select('id, name')
      .order('name');
    
    if (plansError) {
      console.log('❌ Error fetching plans:', plansError);
    } else {
      console.log(`\n📋 Available membership plans (${plans.length}):`);
      plans.forEach(plan => {
        console.log(`   - ${plan.name} (ID: ${plan.id})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

async function main() {
  console.log('🚀 Starting User Profile Fix...\n');
  
  // Check database structure
  const dbData = await checkDatabaseStructure();
  if (!dbData) {
    console.log('❌ Database structure check failed. Exiting.');
    return;
  }
  
  // Fix user profiles for existing users
  await fixUserProfiles(dbData);
  
  // Generate trigger SQL
  await generateTriggerSQL();
  
  // Test current state
  await testCurrentState();
  
  console.log('\n✅ All fixes completed!\n');
  console.log('📋 Next steps:');
  console.log('   1. Execute the user_profile_trigger.sql file in your Supabase dashboard');
  console.log('   2. Test user registration to ensure profiles are created automatically');
  console.log('   3. Verify that new users get the "Intern" membership by default');
}

main();