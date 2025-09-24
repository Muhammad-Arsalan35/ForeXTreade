require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixUserProfiles() {
  console.log('🔧 Creating user profiles with minimal data...\n');
  
  try {
    // Get the Intern membership plan
    const { data: internPlan, error: planError } = await supabase
      .from('membership_plans')
      .select('id')
      .eq('name', 'Intern')
      .single();
    
    if (planError || !internPlan) {
      console.log('❌ Intern membership plan not found:', planError);
      return;
    }
    
    console.log('✅ Found Intern membership plan:', internPlan.id);
    
    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, full_name, username, phone_number');
    
    if (usersError) {
      console.log('❌ Error fetching users:', usersError);
      return;
    }
    
    console.log(`📋 Found ${users.length} users`);
    
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
        
        // Create new profile with only basic columns
        const { data: newProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: user.id,
            full_name: user.full_name,
            username: user.username,
            phone_number: user.phone_number,
            membership_type: 'intern',
            membership_level: 'Intern'
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
              end_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
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
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

async function generateSimpleTriggerSQL() {
  console.log('\n📝 Generating simple trigger SQL...\n');
  
  const triggerSQL = `-- ============================================================================
-- SIMPLE USER PROFILE TRIGGER
-- ============================================================================

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
    
    -- Create user profile with basic columns only
    INSERT INTO public.user_profiles (
        user_id,
        full_name,
        username,
        phone_number,
        membership_type,
        membership_level
    ) VALUES (
        new_user_id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
        COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
        COALESCE(NEW.raw_user_meta_data->>'phone_number', NEW.phone),
        'intern',
        'Intern'
    );
    
    -- Create user plan entry
    IF intern_plan_id IS NOT NULL THEN
        INSERT INTO public.user_plans (
            user_id,
            plan_id,
            end_date,
            status,
            is_active
        ) VALUES (
            new_user_id,
            intern_plan_id,
            CURRENT_DATE + INTERVAL '3 days',
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

  fs.writeFileSync('simple_user_profile_trigger.sql', triggerSQL);
  console.log('✅ Created simple_user_profile_trigger.sql file');
  console.log('   Execute this SQL in your Supabase dashboard to set up the trigger');
}

async function testRegistration() {
  console.log('\n🧪 Testing registration flow...\n');
  
  try {
    // Count current state
    const { count: profileCount } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true });
    
    const { count: userCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    console.log(`✅ Current state: ${userCount} users, ${profileCount} profiles`);
    
    // Test if we can create a test profile manually
    const testUserId = 'test-user-' + Date.now();
    const { data: testUser, error: testUserError } = await supabase
      .from('users')
      .insert({
        full_name: 'Test User',
        username: testUserId,
        phone_number: '+1234567890',
        referral_code: 'TEST123',
        user_status: 'active'
      })
      .select()
      .single();
    
    if (testUserError) {
      console.log('❌ Error creating test user:', testUserError);
      return;
    }
    
    console.log('✅ Created test user:', testUser.id);
    
    // Try to create profile for test user
    const { data: testProfile, error: testProfileError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: testUser.id,
        full_name: testUser.full_name,
        username: testUser.username,
        phone_number: testUser.phone_number,
        membership_type: 'intern',
        membership_level: 'Intern'
      })
      .select()
      .single();
    
    if (testProfileError) {
      console.log('❌ Error creating test profile:', testProfileError);
    } else {
      console.log('✅ Created test profile successfully!');
      
      // Clean up test data
      await supabase.from('user_profiles').delete().eq('user_id', testUser.id);
      await supabase.from('users').delete().eq('id', testUser.id);
      console.log('✅ Cleaned up test data');
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

async function main() {
  console.log('🚀 Starting Simple User Profile Fix...\n');
  
  await fixUserProfiles();
  await generateSimpleTriggerSQL();
  await testRegistration();
  
  console.log('\n✅ All fixes completed!\n');
  console.log('📋 Next steps:');
  console.log('   1. Execute the simple_user_profile_trigger.sql file in your Supabase dashboard');
  console.log('   2. Test user registration to ensure profiles are created automatically');
  console.log('   3. Verify that new users get the "Intern" membership by default');
}

main();